import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { validateEnv } from "@/lib/validate-env";

type CheckStatus = "ok" | "error" | "skipped";

type CheckResult = {
  status: CheckStatus;
  message?: string;
};

type HealthResponse = {
  status: "ok" | "error" | "degraded";
  checks: {
    env: ReturnType<typeof validateEnv>;
    database: CheckResult;
    stripe: CheckResult;
    resend: CheckResult;
  };
};

export const dynamic = "force-dynamic";

const stripeClient = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function checkDatabase(): Promise<CheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: toMessage(error) };
  }
}

async function checkStripe(): Promise<CheckResult> {
  if (!stripeClient) {
    return { status: "skipped", message: "STRIPE_SECRET_KEY not set" };
  }

  try {
    await stripeClient.balance.retrieve();
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: toMessage(error) };
  }
}

async function checkResend(): Promise<CheckResult> {
  if (!resendClient) {
    return { status: "skipped", message: "RESEND_API_KEY not set" };
  }

  try {
    await resendClient.domains.list();
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: toMessage(error) };
  }
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET() {
  const env = validateEnv();
  const [database, stripe, resend] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkResend(),
  ]);

  const requiredFailures = [env.status !== "ok", database.status !== "ok"].some(
    Boolean
  );
  const anyFailure =
    requiredFailures ||
    [stripe.status, resend.status].some((s) => s === "error");

  const overall: HealthResponse["status"] = requiredFailures
    ? "error"
    : anyFailure
      ? "degraded"
      : "ok";

  const response: HealthResponse = {
    status: overall,
    checks: {
      env,
      database,
      stripe,
      resend,
    },
  };

  const statusCode = overall === "error" ? 503 : 200;
  return NextResponse.json(response, { status: statusCode });
}
