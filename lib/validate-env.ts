export type EnvCheckStatus = "ok" | "error";

export type EnvCheckResult = {
  status: EnvCheckStatus;
  missing: string[];
  optionalMissing: string[];
};

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
];

const OPTIONAL_KEYS = [
  "DIRECT_URL",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_MERCHANT_EMAIL",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "PAYMENT_CREDENTIALS_ENCRYPTION_KEY",
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL",
  "NEXT_PUBLIC_APP_URL",
  "BLOB_READ_WRITE_TOKEN",
  "LICENSE_KEY",
  "PLATFORM_URL",
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
