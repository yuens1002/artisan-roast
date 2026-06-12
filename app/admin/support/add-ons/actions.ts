"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { getInstanceId } from "@/lib/telemetry";
import { prisma } from "@/lib/prisma";
import { demoBypassAction } from "@/lib/demo";

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
  alaCarteSlug: z.string().min(1),
});

interface CheckoutResult {
  success: boolean;
  error?: string;
  url?: string;
}

/**
 * Start a Stripe checkout session for an a la carte package via the platform.
 * Sends alaCarteSlug, callbackUrl, customerEmail, and instanceId.
 */
export async function startAlaCarteCheckout(
  formData: FormData
): Promise<CheckoutResult> {
  await requireAdmin();

  const parsed = checkoutSchema.safeParse({
    alaCarteSlug: formData.get("alaCarteSlug"),
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid package" };
  }

  const bypass = demoBypassAction("/admin/support/add-ons?demo=success");
  if (bypass) return bypass;

  try {
    const instanceId = await getInstanceId(prisma);

    const contactSetting = await prisma.siteSettings.findUnique({
      where: { key: "contactEmail" },
    });

    const response = await fetch(`${PLATFORM_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alaCarteSlug: parsed.data.alaCarteSlug,
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

    const data = (await response.json()) as import("artisan-roast-sdk/alacarte").CheckoutResponse;
    return { success: true, url: data.url };
  } catch {
    return { success: false, error: "Failed to start checkout" };
  }
}
