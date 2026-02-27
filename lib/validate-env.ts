export type EnvCheckStatus = "ok" | "error";

export type EnvCheckResult = {
  status: EnvCheckStatus;
  missing: string[];
  optionalMissing: string[];
};

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
];

const OPTIONAL_KEYS = [
  "DIRECT_URL",
  "RESEND_MERCHANT_EMAIL",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_VAPI_PUBLIC_KEY",
  "NEXT_PUBLIC_VAPI_WEBHOOK_SECRET",
  "BLOB_READ_WRITE_TOKEN",
];

export const validateEnv = (options?: {
  throwOnError?: boolean;
}): EnvCheckResult => {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  const optionalMissing = OPTIONAL_KEYS.filter((key) => !process.env[key]);
  const status: EnvCheckStatus = missing.length === 0 ? "ok" : "error";

  if (status === "error" && options?.throwOnError) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return { status, missing, optionalMissing };
};

export const requiredEnvKeys = REQUIRED_KEYS;
export const optionalEnvKeys = OPTIONAL_KEYS;
