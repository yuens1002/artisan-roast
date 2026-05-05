"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { getInstanceId } from "@/lib/telemetry";
import { prisma } from "@/lib/prisma";
import { demoBypassAction } from "@/lib/demo";

const PLATFORM_API_URL = (process.env.PLATFORM_API_URL ?? "").replace(
  /\/+$/,
  ""
);

const PLATFORM_URL = (
  process.env.PLATFORM_URL || "https://manage.artisanroast.app"
).replace(/\/+$/, "");

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000"
).replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

const checkoutSchema = z.object({
  planSlug: z.string().min(1),
});

interface CheckoutResult {
  success: boolean;
  error?: string;
  url?: string;
}

/**
 * Start a Stripe checkout session for a plan via the platform.
 * Sends callbackUrl, customerEmail, and instanceId per handoff §2.
 */
export async function startCheckout(
  formData: FormData
): Promise<CheckoutResult> {
  await requireAdmin();

  const parsed = checkoutSchema.safeParse({
    planSlug: formData.get("planSlug"),
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid plan" };
  }

  const bypass = demoBypassAction("/admin/support/plans?demo=success");
  if (bypass) return bypass;

  try {
    const instanceId = await getInstanceId(prisma);

    // Fetch contactEmail for customerEmail
    const contactSetting = await prisma.siteSettings.findUnique({
      where: { key: "contactEmail" },
    });

    const response = await fetch(`${PLATFORM_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planSlug: parsed.data.planSlug,
        instanceId: instanceId || "",
        customerEmail: contactSetting?.value || "",
        callbackUrl: `${APP_URL}/api/admin/platform/activate`,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, error: body || "Checkout failed" };
    }

    const data = (await response.json()) as { url: string };
    return { success: true, url: data.url };
  } catch {
    return { success: false, error: "Failed to start checkout" };
  }
}

// ---------------------------------------------------------------------------
// Cancel trial / subscription — captures reason + routes to the right effect
// ---------------------------------------------------------------------------

const cancelSchema = z.object({
  reason: z.string().min(1),
  otherText: z.string().max(500).optional(),
  variant: z.enum(["no-card", "card-added"]),
});

export type CancelTrialInput = z.infer<typeof cancelSchema>;

interface CancelTrialResult {
  success: boolean;
  error?: string;
  /** Stripe Portal URL — present when variant is "card-added" and the
   *  upstream call succeeds. Client opens this in a new tab. */
  portalUrl?: string;
}

/**
 * Submit a trial cancellation with a captured reason.
 *
 * Variants:
 * - "no-card" — UI mock for v1; the upstream cancel endpoint is not yet
 *   shipped. Returns success without persisting. The wiring is identical
 *   to the card-added variant; only the upstream destination changes when
 *   the endpoint becomes available.
 * - "card-added" — calls the upstream billing portal endpoint and returns
 *   the Stripe Portal URL. The customer completes cancellation through
 *   Stripe Portal in a new tab.
 */
export async function submitCancellation(
  input: CancelTrialInput
): Promise<CancelTrialResult> {
  await requireAdmin();

  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid cancellation request" };
  }

  // No-card variant: upstream cancel endpoint not yet shipped. Log the reason
  // so feedback isn't silently lost — replace with upstream call when it lands.
  if (parsed.data.variant === "no-card") {
    console.info("trial:cancel:no-card", {
      reason: parsed.data.reason,
      otherText: parsed.data.otherText,
    });
    return { success: true };
  }

  // Card-added variant: fetch a Stripe Portal session URL.
  if (!PLATFORM_API_URL) {
    return { success: false, error: "Hosting service not configured" };
  }
  const licenseKey = process.env.LICENSE_KEY;
  if (!licenseKey) {
    return { success: false, error: "License key missing" };
  }

  try {
    const response = await fetch(`${PLATFORM_API_URL}/api/billing/portal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${licenseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: parsed.data.reason,
        otherText: parsed.data.otherText,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { success: false, error: "Could not open billing portal" };
    }

    const data = (await response.json()) as { url: string };
    return { success: true, portalUrl: data.url };
  } catch {
    return { success: false, error: "Could not reach the hosting service" };
  }
}
