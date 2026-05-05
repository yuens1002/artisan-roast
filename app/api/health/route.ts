import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { validateEnv } from "@/lib/validate-env";
import { getStripe } from "@/lib/services/stripe";
import { getResend } from "@/lib/services/resend";

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

async function checkDatabase(): Promise<CheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: toMessage(error) };
  }
}

async function checkStripe(): Promise<CheckResult> {
  const stripe = await getStripe();
  if (!stripe) {
    return { status: "skipped", message: "Stripe is not configured" };
  }

  try {
    await stripe.balance.retrieve();
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: toMessage(error) };
  }
}

async function checkResend(): Promise<CheckResult> {
  const resend = getResend();
  if (!resend) {
    return { status: "skipped", message: "RESEND_API_KEY not set" };
  }

  try {
    await resend.domains.list();
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
