import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import Stripe from "stripe";
import { requireAdminApi } from "@/lib/admin";
import { resetStripeClient } from "@/lib/services/stripe";
import {
  loadStripeCredentials,
  saveStripeCredentials,
  clearStripeCredentials,
  getStripeConfigStatus,
} from "@/lib/payments/credentials";

function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return key ? "••••" : "";
  return "••••••••" + key.slice(-4);
}

function detectMode(key: string): "test" | "live" | null {
  if (/^(sk|pk|rk)_test_/.test(key)) return "test";
  if (/^(sk|pk|rk)_live_/.test(key)) return "live";
  return null;
}

function checkModeMismatch(
  secretKey: string,
  publishableKey: string
): string | null {
  const secretMode = detectMode(secretKey);
  const pubMode = detectMode(publishableKey);
  if (secretMode && pubMode && secretMode !== pubMode) {
    return `Test/live mode mismatch — secret key is ${secretMode}, publishable key is ${pubMode}. Both must be from the same Stripe mode.`;
  }
  return null;
}

const StripeUpdateSchema = z.object({
  secretKey: z.string().optional(),
  publishableKey: z.string().optional(),
  webhookSecret: z.string().optional(),
});

async function validateWithStripe(secretKey: string): Promise<{
  ok: boolean;
  accountId?: string;
  accountName?: string;
  country?: string;
  currency?: string;
  error?: string;
}> {
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
    const account = await stripe.accounts.retrieve();
    // charges_enabled reflects live-mode onboarding status; skip for test mode
    // (test charge below verifies payment capability for test keys)
    if (detectMode(secretKey) !== "test" && !account.charges_enabled) {
      return { ok: false, error: "charges_disabled" };
    }
    return {
      ok: true,
      accountId: account.id,
      accountName:
        (account as unknown as { settings?: { dashboard?: { display_name?: string } } })
          .settings?.dashboard?.display_name ?? account.id,
      country: account.country ?? undefined,
      currency: account.default_currency ?? undefined,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe validation failed";
    return { ok: false, error: message };
  }
}

async function runTestCharge(secretKey: string): Promise<{ ok: boolean }> {
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
    const pi = await stripe.paymentIntents.create({
      amount: 100,
      currency: "usd",
      payment_method: "pm_card_visa",
      payment_method_types: ["card"],
      confirm: true,
      capture_method: "manual",
    });
    await stripe.paymentIntents.cancel(pi.id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function verifyPublishableKey(
  effectiveSecretKey: string,
  effectivePublishableKey: string
): Promise<boolean> {
  const stripe = new Stripe(effectiveSecretKey, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  });
  let piId: string | undefined;
  try {
    const pi = await stripe.paymentIntents.create({ amount: 50, currency: "usd" });
    piId = pi.id;
    if (!pi.client_secret) return false;
    const res = await fetch(
      `https://api.stripe.com/v1/payment_intents/${pi.id}?client_secret=${encodeURIComponent(pi.client_secret)}`,
      { headers: { Authorization: `Bearer ${effectivePublishableKey}` } }
    );
    return res.ok;
  } catch {
    return false;
  } finally {
    if (piId) {
      try {
        await stripe.paymentIntents.cancel(piId);
      } catch {}
    }
  }
}

export async function GET() {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const envSecretSet = !!process.env.STRIPE_SECRET_KEY;
    const envWebhookSet = !!process.env.STRIPE_WEBHOOK_SECRET;
    const envPublishableSet = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    const dbStatus = await getStripeConfigStatus();

    let storedSecretMasked: string | null = null;
    let storedWebhookMasked: string | null = null;

    if (dbStatus.hasRow && !dbStatus.decryptionError) {
      const creds = await loadStripeCredentials();
      if (creds?.secretKey) storedSecretMasked = maskApiKey(creds.secretKey);
      if (creds?.webhookSecret)
        storedWebhookMasked = maskApiKey(creds.webhookSecret);
    }

    return NextResponse.json({
      envSecretSet,
      envWebhookSet,
      envPublishableSet,
      db: {
        hasRow: dbStatus.hasRow,
        hasSecretKey: dbStatus.hasSecretKey,
        hasWebhookSecret: dbStatus.hasWebhookSecret,
        publishableKey: dbStatus.publishableKey,
        accountId: dbStatus.accountId,
        accountName: dbStatus.accountName,
        isTestMode: dbStatus.isTestMode,
        lastValidatedAt: dbStatus.lastValidatedAt,
        decryptionError: dbStatus.decryptionError,
        secretKeyMasked: storedSecretMasked,
        webhookSecretMasked: storedWebhookMasked,
      },
    });
  } catch (error) {
    console.error("Error fetching Stripe settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const parsed = StripeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let { secretKey, publishableKey, webhookSecret } = parsed.data;

    // Strip masked placeholders — unchanged sensitive fields become undefined
    if (secretKey?.startsWith("••")) secretKey = undefined;
    if (webhookSecret?.startsWith("••")) webhookSecret = undefined;
    // Normalize empty strings — treat as "not provided"
    if (secretKey === "") secretKey = undefined;
    if (publishableKey === "") publishableKey = undefined;
    if (webhookSecret === "") webhookSecret = undefined;

    // Short-circuit: client sent only unchanged values
    if (!secretKey && !publishableKey && !webhookSecret) {
      return NextResponse.json({ success: true });
    }

    const GENERIC_ERROR = "Something went wrong, one or more keys may be incorrect.";

    // Format checks — reject unrecognized key shapes before any DB/API work
    if (secretKey && !/^sk_(test|live)_/.test(secretKey)) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
    }
    if (publishableKey && !/^pk_(test|live)_/.test(publishableKey)) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
    }
    if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
    }

    // Determine effective secret + publishable key for consistency check.
    // If only one of the pair changed, load the other from DB.
    let effectiveSecretKey = secretKey;
    let effectivePublishableKey = publishableKey;
    if (secretKey !== undefined || publishableKey !== undefined) {
      if (!effectiveSecretKey || !effectivePublishableKey) {
        const existing = await loadStripeCredentials();
        effectiveSecretKey ??= existing?.secretKey ?? undefined;
        effectivePublishableKey ??= existing?.publishableKey ?? undefined;
      }
    }

    // Mode consistency check across the effective set
    if (effectiveSecretKey && effectivePublishableKey) {
      if (checkModeMismatch(effectiveSecretKey, effectivePublishableKey)) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
      }
    }

    let accountMeta: {
      accountId?: string;
      accountName?: string;
      isTestMode?: boolean;
      lastValidatedAt?: Date;
    } = {};

    if (secretKey) {
      const validation = await validateWithStripe(secretKey);
      if (!validation.ok) {
        const error =
          validation.error === "charges_disabled"
            ? "This Stripe account is not enabled to accept payments. Complete your Stripe onboarding before connecting."
            : GENERIC_ERROR;
        return NextResponse.json({ error }, { status: 400 });
      }

      if (detectMode(secretKey) === "test") {
        const testCharge = await runTestCharge(secretKey);
        if (!testCharge.ok) {
          return NextResponse.json(
            { error: "Something went wrong. Check your Stripe account settings." },
            { status: 400 }
          );
        }
      }

      accountMeta = {
        accountId: validation.accountId,
        accountName: validation.accountName,
        isTestMode: detectMode(secretKey) === "test",
        lastValidatedAt: new Date(),
      };
    }

    // Verify the publishable key belongs to the same Stripe account as the secret key
    if (effectiveSecretKey && effectivePublishableKey) {
      const pubKeyValid = await verifyPublishableKey(effectiveSecretKey, effectivePublishableKey);
      if (!pubKeyValid) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
      }
    }

    await saveStripeCredentials({
      ...(secretKey !== undefined && { secretKey }),
      ...(publishableKey !== undefined && { publishableKey }),
      ...(webhookSecret !== undefined && { webhookSecret }),
      ...accountMeta,
    });

    resetStripeClient();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving Stripe credentials:", error);
    return NextResponse.json(
      { error: "Failed to save Stripe credentials" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const creds = await loadStripeCredentials();
    if (!creds?.secretKey) {
      return NextResponse.json(
        { error: "No Stripe credentials configured." },
        { status: 400 }
      );
    }

    const GENERIC_ERROR = "Something went wrong, one or more keys may be incorrect.";

    const validation = await validateWithStripe(creds.secretKey);
    if (!validation.ok) {
      const error =
        validation.error === "charges_disabled"
          ? "This Stripe account is not enabled to accept payments. Complete your Stripe onboarding before connecting."
          : GENERIC_ERROR;
      return NextResponse.json({ error }, { status: 400 });
    }

    if (detectMode(creds.secretKey) === "test") {
      const testCharge = await runTestCharge(creds.secretKey);
      if (!testCharge.ok) {
        return NextResponse.json(
          { error: "Something went wrong. Check your Stripe account settings." },
          { status: 400 }
        );
      }
    }

    if (creds.publishableKey) {
      const pubKeyOk = await verifyPublishableKey(creds.secretKey, creds.publishableKey);
      if (!pubKeyOk) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying Stripe credentials:", error);
    return NextResponse.json(
      { error: "Failed to verify Stripe credentials" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    await clearStripeCredentials();
    resetStripeClient();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing Stripe credentials:", error);
    return NextResponse.json(
      { error: "Failed to clear Stripe credentials" },
      { status: 500 }
    );
  }
}
