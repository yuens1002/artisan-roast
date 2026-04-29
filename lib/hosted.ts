/**
 * Hosted-mode utilities (server-only).
 *
 * Next.js inlines `process.env.HOSTED_TRIAL_ID` at build time when read at
 * module top-level, so `IS_HOSTED` becomes a literal boolean and branches
 * guarded by it are eliminated as dead code in self-hosted builds.
 *
 * See `docs/features/hosting-extension/ARCHITECTURE.md` for the full
 * integration contract.
 */

// ---------------------------------------------------------------------------
// Build-time constant
// ---------------------------------------------------------------------------

export const IS_HOSTED = Boolean(process.env.HOSTED_TRIAL_ID);

// ---------------------------------------------------------------------------
// Types — TrialStatus discriminated union
// ---------------------------------------------------------------------------

export type SupportPool = {
  slug: string;
  label: string;
  limit: number;
  used: number;
};

export type TrialStatusActive = {
  status: "ACTIVE";
  cardAdded: boolean;
  daysRemaining: number;
  daysLimit: number;
  deprovisionAt?: string;
};

export type TrialStatusExpired = {
  status: "EXPIRED";
  cardAdded: false;
  daysRemaining: 0;
  daysLimit: number;
  deprovisionAt: string;
};

export type TrialStatusConverted = {
  status: "CONVERTED";
  plan: {
    name: string;
    renewsAt: string;
    price: number;
    currency: string;
  };
  support: {
    pools: SupportPool[];
  };
};

export type TrialStatus =
  | TrialStatusActive
  | TrialStatusExpired
  | TrialStatusConverted;

// ---------------------------------------------------------------------------
// getTrialStatus
//   Server-side fetch to the configured hosting service. Returns null when
//   hosted mode is off, when env vars are missing, or when the upstream
//   request fails — never throws.
// ---------------------------------------------------------------------------

export async function getTrialStatus(): Promise<TrialStatus | null> {
  const trialId = process.env.HOSTED_TRIAL_ID;
  const apiUrl = process.env.PLATFORM_API_URL;

  if (!trialId || !apiUrl) return null;

  const url = `${apiUrl.replace(/\/+$/, "")}/api/trial/hosted/${trialId}/status`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(
        `getTrialStatus failed [${response.status}]: ${response.statusText}`
      );
      return null;
    }

    return (await response.json()) as TrialStatus;
  } catch (error) {
    console.error("getTrialStatus error:", error);
    return null;
  }
}
