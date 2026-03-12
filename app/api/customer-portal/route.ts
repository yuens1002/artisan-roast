import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import Stripe from "stripe";
import { getStripe } from "@/lib/services/stripe";
import { getErrorMessage } from "@/lib/error-utils";

/**
 * POST /api/customer-portal
 * Creates a Stripe Customer Portal session for subscription management
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments not configured" },
        { status: 503 }
      );
    }

    const session = await auth();

    if (!session?.user?.email) {
      console.log("❌ Customer portal: Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stripeCustomerId, returnUrl } = await req.json();

    console.log("\n=== CUSTOMER PORTAL REQUEST ===");
    console.log("User:", session.user.email);
    console.log("Customer ID:", stripeCustomerId);
    console.log("Return URL:", returnUrl);

    if (!stripeCustomerId) {
      console.log("❌ Missing Stripe customer ID");
      return NextResponse.json(
        { error: "Stripe customer ID is required" },
        { status: 400 }
      );
    }

    // Verify the customer exists in Stripe, if not return a helpful error
    const customerId = stripeCustomerId;
    try {
      await stripe.customers.retrieve(stripeCustomerId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing') {
        console.log("❌ Customer doesn't exist in Stripe:", stripeCustomerId);
        return NextResponse.json(
          { error: "Customer account not found. Please contact support or create a new order to set up billing." },
          { status: 404 }
        );
      }
      throw error; // Re-throw if it's a different error
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
    });

    console.log("✅ Portal session created:", portalSession.id);
    console.log("Portal URL:", portalSession.url);
    console.log("=======================\n");

    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create portal session") },
      { status: 500 }
    );
  }
}
