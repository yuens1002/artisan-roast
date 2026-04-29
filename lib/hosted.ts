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
// Dev/verification fixtures
//   `MOCK_HOSTED_STATUS` short-circuits the upstream fetch and returns a
//   hardcoded fixture so the plans page can be exercised without a live
//   hosting service. Mirrors the `MOCK_LICENSE_TIER` pattern in lib/license.ts.
//   Values: ACTIVE_NO_CARD | ACTIVE_CARD_ADDED | EXPIRED | CONVERTED
// ---------------------------------------------------------------------------

const MOCK_FIXTURES: Record<string, TrialStatus> = {
  ACTIVE_NO_CARD: {
    status: "ACTIVE",
    cardAdded: false,
    daysRemaining: 12,
    daysLimit: 14,
  },
  ACTIVE_CARD_ADDED: {
    status: "ACTIVE",
    cardAdded: true,
    daysRemaining: 24,
    daysLimit: 30,
  },
  EXPIRED: {
    status: "EXPIRED",
    cardAdded: false,
    daysRemaining: 0,
    daysLimit: 14,
    deprovisionAt: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString(),
  },
  CONVERTED: {
    status: "CONVERTED",
    plan: {
      name: "House Blend",
      renewsAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      price: 4900,
      currency: "USD",
    },
    support: {
      pools: [
        { slug: "tickets", label: "Priority Tickets", limit: 5, used: 1 },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// getTrialStatus
//   Server-side fetch to the configured hosting service. Returns null when
//   hosted mode is off, when env vars are missing, or when the upstream
//   request fails — never throws.
// ---------------------------------------------------------------------------

export async function getTrialStatus(): Promise<TrialStatus | null> {
  // Dev / verification override — short-circuit before requiring real env vars.
  const mockKey = process.env.MOCK_HOSTED_STATUS;
  if (mockKey && MOCK_FIXTURES[mockKey]) {
    return MOCK_FIXTURES[mockKey];
  }

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
