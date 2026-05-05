import Stripe from "stripe";
import { loadStripeCredentials } from "@/lib/payments/credentials";

let _stripe: Stripe | null = null;

/**
 * Returns the Stripe client, or null if credentials are not configured.
 * Resolution order: env (STRIPE_SECRET_KEY) → DB (PaymentProcessorConfig) → null
 * Lazily initializes the singleton; call resetStripeClient() after credential rotation.
 */
export async function getStripe(): Promise<Stripe | null> {
  if (_stripe) return _stripe;

  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey) {
    _stripe = new Stripe(envKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
    return _stripe;
  }

  const dbCreds = await loadStripeCredentials();
  if (dbCreds?.secretKey) {
    _stripe = new Stripe(dbCreds.secretKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
    return _stripe;
  }

  return null;
}

/**
 * Clears the Stripe singleton so the next getStripe() call re-reads credentials.
 * Call after saving or deleting credentials via the admin UI.
 */
export function resetStripeClient(): void {
  _stripe = null;
}

/**
 * Returns the Stripe webhook secret.
 * Resolution order: env (STRIPE_WEBHOOK_SECRET) → DB → null
 *
 * If STRIPE_SECRET_KEY is present in env we assume the entire Stripe
 * configuration lives in env; we do NOT fall back to a DB-stored webhook
 * secret that may belong to a different account.
 */
export async function getStripeWebhookSecret(): Promise<string | null> {
  const envSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (envSecret) return envSecret;

  if (process.env.STRIPE_SECRET_KEY) return null;

  const dbCreds = await loadStripeCredentials();
  return dbCreds?.webhookSecret ?? null;
}

/**
 * Returns true if Stripe credentials are configured via either env or DB.
 */
export async function isStripeConfigured(): Promise<boolean> {
  if (process.env.STRIPE_SECRET_KEY) return true;
  const dbCreds = await loadStripeCredentials();
  return !!dbCreds?.secretKey;
}
