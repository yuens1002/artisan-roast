import { logger } from "@/lib/logger";
import { resend } from "@/lib/services/resend";
import { getEmailBranding } from "@/lib/config/app-settings";
import MerchantOrderNotification from "@/emails/MerchantOrderNotification";
import type { SendMerchantNotificationParams, EmailSendResult } from "./types";
import {
  buildOrderEmailItems,
  buildShippingAddressForEmail,
  formatOrderNumber,
  formatOrderDate,
} from "./email-data-builder";

/**
 * Sends order notification email to merchant
 */
export async function sendMerchantNotification(
  params: SendMerchantNotificationParams
): Promise<EmailSendResult> {
  const { order, isRecurringOrder = false, deliverySchedule } = params;

  const merchantEmail =
    process.env.RESEND_MERCHANT_EMAIL ||
    process.env.MERCHANT_EMAIL ||
    "admin@artisan-roast.com";

  try {
    const emailItems = buildOrderEmailItems(order.items);
    const shippingAddressData = buildShippingAddressForEmail(order);
    const orderNumber = formatOrderNumber(order.id);
    const { logoUrl } = await getEmailBranding();

    // Determine subject based on order type
    const subject = isRecurringOrder
      ? `Subscription Renewal - ${deliverySchedule} - #${orderNumber}`
      : `New Order #${orderNumber} - Action Required`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "orders@artisan-roast.com",
      to: merchantEmail,
      subject,
      react: MerchantOrderNotification({
        orderNumber,
        customerName: order.recipientName || "Customer",
        customerEmail: order.customerEmail || "",
        items: emailItems,
        totalInCents: order.totalInCents,
        deliveryMethod: order.deliveryMethod as "DELIVERY" | "PICKUP",
        shippingAddress: shippingAddressData,
        orderDate: formatOrderDate(order.createdAt),
        isRecurringOrder,
        logoUrl,
      }),
    });

    logger.debug(`📧 Merchant notification sent for order ${orderNumber}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to send merchant email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sends merchant notifications for multiple orders
 */
export async function sendMerchantNotifications(
  orders: SendMerchantNotificationParams[]
): Promise<EmailSendResult[]> {
  const results: EmailSendResult[] = [];

  for (const orderParams of orders) {
    const result = await sendMerchantNotification(orderParams);
    results.push(result);
  }

  return results;
}
