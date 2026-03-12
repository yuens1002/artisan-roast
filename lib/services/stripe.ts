import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Returns the Stripe client, or null if STRIPE_SECRET_KEY is not configured.
 * Lazily initializes the singleton on first call.
 */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Returns true if STRIPE_SECRET_KEY is set in environment variables.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
