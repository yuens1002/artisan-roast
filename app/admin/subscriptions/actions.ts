"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/services/stripe";
import { revalidatePath } from "next/cache";

/**
 * Calculate next period end based on delivery schedule
 * E.g., "Every 2 weeks" -> add 2 weeks
 */
function calculateNextPeriodTimestamp(
  currentPeriodEnd: Date,
  deliverySchedule: string | null
): number {
  const periodEnd = new Date(currentPeriodEnd);

  // Parse delivery schedule (e.g., "Every 2 weeks", "Every month")
  if (!deliverySchedule) {
    // Default to 2 weeks if no schedule
    periodEnd.setDate(periodEnd.getDate() + 14);
  } else if (deliverySchedule.toLowerCase().includes("week")) {
    const match = deliverySchedule.match(/(\d+)/);
    const weeks = match ? parseInt(match[1], 10) : 2;
    periodEnd.setDate(periodEnd.getDate() + weeks * 7);
  } else if (deliverySchedule.toLowerCase().includes("month")) {
    const match = deliverySchedule.match(/(\d+)/);
    const months = match ? parseInt(match[1], 10) : 1;
    periodEnd.setMonth(periodEnd.getMonth() + months);
  } else {
    // Default to 2 weeks
    periodEnd.setDate(periodEnd.getDate() + 14);
  }

  return Math.floor(periodEnd.getTime() / 1000);
}

export async function getSubscriptions() {
  await requireAdmin();

  const subscriptions = await prisma.subscription.findMany({
    select: {
      id: true,
      stripeSubscriptionId: true,
      status: true,
      priceInCents: true,
      deliverySchedule: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      pausedUntil: true,
      productNames: true,
      quantities: true,
      recipientName: true,
      recipientPhone: true,
      shippingStreet: true,
      shippingCity: true,
      shippingState: true,
      shippingPostalCode: true,
      shippingCountry: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Fetch most recent order ID for each subscription
  const subIds = subscriptions
    .map((s) => s.stripeSubscriptionId)
    .filter(Boolean);
  const recentOrders = subIds.length > 0
    ? await prisma.order.findMany({
        where: { stripeSubscriptionId: { in: subIds } },
        select: { id: true, stripeSubscriptionId: true },
        orderBy: { createdAt: "desc" },
        distinct: ["stripeSubscriptionId"],
      })
    : [];
  const orderMap = new Map(
    recentOrders.map((o) => [o.stripeSubscriptionId, o.id])
  );

  return subscriptions.map((s) => ({
    ...s,
    mostRecentOrderId: orderMap.get(s.stripeSubscriptionId) ?? null,
  }));
}

export async function cancelSubscription(id: string) {
  await requireAdmin();

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    select: {
      stripeSubscriptionId: true,
      status: true,
    },
  });

  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  if (subscription.status !== "ACTIVE" && subscription.status !== "PAUSED") {
    return {
      success: false,
      error: "Can only cancel active or paused subscriptions",
    };
  }

  const stripe = getStripe();
  if (!stripe) return { success: false, error: "Payments not configured" };

  // Cancel at period end - customer keeps access until period ends
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Update local database
  await prisma.subscription.update({
    where: { id },
    data: {
      cancelAtPeriodEnd: true,
    },
  });

  revalidatePath("/admin/subscriptions");

  return { success: true, message: "Subscription will be canceled at period end" };
}

export async function skipBillingPeriod(id: string) {
  await requireAdmin();

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    select: {
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
      deliverySchedule: true,
      status: true,
    },
  });

  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  if (subscription.status !== "ACTIVE") {
    return {
      success: false,
      error: "Can only skip billing on active subscriptions",
    };
  }

  // Calculate when to resume (after the next billing period)
  const resumesAt = calculateNextPeriodTimestamp(
    subscription.currentPeriodEnd,
    subscription.deliverySchedule
  );

  const stripe = getStripe();
  if (!stripe) return { success: false, error: "Payments not configured" };

  // Pause collection - void next invoice, auto-resume after one period
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    pause_collection: {
      behavior: "void",
      resumes_at: resumesAt,
    },
  });

  // Update local database to PAUSED with resume date
  await prisma.subscription.update({
    where: { id },
    data: {
      status: "PAUSED",
      pausedUntil: new Date(resumesAt * 1000),
    },
  });

  revalidatePath("/admin/subscriptions");

  return {
    success: true,
    message: "Next billing period will be skipped",
    resumesAt: new Date(resumesAt * 1000).toISOString(),
  };
}

export async function resumeSubscription(id: string) {
  await requireAdmin();

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    select: {
      stripeSubscriptionId: true,
      status: true,
    },
  });

  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  if (subscription.status !== "PAUSED") {
    return { success: false, error: "Can only resume paused subscriptions" };
  }

  const stripe = getStripe();
  if (!stripe) return { success: false, error: "Payments not configured" };

  // Remove pause_collection to resume billing
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    pause_collection: "",
  });

  // Update local database to ACTIVE
  await prisma.subscription.update({
    where: { id },
    data: {
      status: "ACTIVE",
      pausedUntil: null,
    },
  });

  revalidatePath("/admin/subscriptions");

  return { success: true, message: "Subscription has been resumed" };
}
