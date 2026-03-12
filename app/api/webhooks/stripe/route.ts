import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/services/stripe";
import { verifyWebhook } from "@/lib/payments/stripe/verify";
import { dispatchEvent } from "./handlers";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  // Verify webhook signature
  const verifyResult = verifyWebhook({
    body,
    signature,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
    stripe,
  });

  if (!verifyResult.success) {
    return NextResponse.json(
      { error: verifyResult.error },
      { status: verifyResult.statusCode }
    );
  }

  // Dispatch event to handler
  try {
    const result = await dispatchEvent(verifyResult.event.type, {
      event: verifyResult.event,
      stripe,
    });

    return NextResponse.json({
      received: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Error processing webhook:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
