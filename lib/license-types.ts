/**
 * License & Plan Types
 *
 * Shared types for the license module, Plan page, and feature gating.
 * Separate file to avoid circular imports when components need just the types.
 */

// ---------------------------------------------------------------------------
// Tier
// ---------------------------------------------------------------------------

export type Tier = "FREE" | "TRIAL" | "PRIORITY_SUPPORT" | "HOSTED";

// ---------------------------------------------------------------------------
// License validation response (from platform)
// ---------------------------------------------------------------------------

export interface LicenseInfo {
  valid: boolean;
  tier: Tier;
  features: string[];
  trialEndsAt: string | null;
  managedBy: string | null;
  compatibility: "full" | "partial";
  warnings: string[];
  usage: UsageInfo | null;
  gaConfig: GAConfig;
  /** Platform-driven CTAs — labels, URLs, and variants come from the platform. */
  availableActions: AvailableAction[];

  // Phase 3 — Plan versioning, metered support, a la carte, legal
  /** Active plan context. Null when no active plan. */
  plan: PlanContext | null;
  /** Previous subscription context for lapsed users. Null for true FREE users. */
  lapsed: LapsedContext | null;
  /** Metered support quotas (always present, zeros for FREE with no purchases). */
  support: SupportQuotas;
  /** A la carte packages available for purchase (any tier). */
  alaCarte: AlaCartePackage[];
  /** Legal document acceptance state. */
  legal: LegalState | null;
}

// ---------------------------------------------------------------------------
// Phase 3 — Plan context
// ---------------------------------------------------------------------------

export interface PlanContext {
  slug: string;
  name: string;
  /** ISO timestamp — when subscriber's terms were locked in. */
  snapshotAt: string;
}

export interface LapsedContext {
  previousTier: string;
  previousFeatures: string[];
  planSlug: string;
  deactivatedAt: string;
  renewUrl: string;
}

// ---------------------------------------------------------------------------
// Phase 3 — Metered support
// ---------------------------------------------------------------------------

export interface CreditPool {
  /** Monthly quota from plan (resets each billing cycle). 0 if no plan. */
  limit: number;
  /** Unused credits from a la carte purchases (never expire). */
  purchased: number;
  /** Credits consumed this billing period. */
  used: number;
  /** limit + purchased - used */
  remaining: number;
}

/** A single metered usage pool with display metadata from the platform. */
export interface UsagePool extends CreditPool {
  /** Machine-readable identifier (e.g. "tickets", "one-on-one", "tokens") */
  slug: string;
  /** Human-readable label (e.g. "Priority Tickets", "1:1 Sessions", "AI Tokens") */
  label: string;
  /** Lucide icon name hint (e.g. "ticket", "calendar", "cpu") */
  icon: string;
}

export interface SupportQuotas {
  /** All metered usage pools — rendered dynamically by slug */
  pools: UsagePool[];
}

// ---------------------------------------------------------------------------
// Phase 3 — A la carte packages
// ---------------------------------------------------------------------------

import type { AlaCartePackage } from "artisan-roast-sdk/alacarte";
export type { AlaCartePackage };

// ---------------------------------------------------------------------------
// Phase 3 — Legal
// ---------------------------------------------------------------------------

export interface LegalState {
  /** Document slugs that require acceptance before feature access. */
  pendingAcceptance: string[];
  /** Map of document slug → accepted version string. */
  acceptedVersions: Record<string, string>;
  /** Map of document slug → ISO timestamp of acceptance. */
  acceptedAt?: Record<string, string>;
}

export interface UsageInfo {
  tokensUsed: number;
  tokenBudget: number;
  hourlyRemaining: number;
  billingRequired: boolean;
}

export interface GAConfig {
  connected: boolean;
  measurementId: string | null;
  propertyName: string | null;
  lastSynced: string | null;
}

// ---------------------------------------------------------------------------
// Available actions (from platform — contextual CTAs)
// ---------------------------------------------------------------------------

export interface AvailableAction {
  /** Machine-readable action identifier (e.g. "start-trial", "manage-billing") */
  slug: string;
  /** Human-readable button label */
  label: string;
  /** Full URL to navigate to */
  url: string;
  /** Button styling hint */
  variant: "primary" | "outline" | "ghost";
  /** Lucide icon name hint (e.g. "calendar", "credit-card", "arrow-up-right") */
  icon: string;
}

// ---------------------------------------------------------------------------
// Usage budget (derived from UsageInfo)
// ---------------------------------------------------------------------------

export interface UsageBudgetResult {
  tokensUsed: number;
  tokenBudget: number;
  percentUsed: number;
  isExhausted: boolean;
  billingRequired: boolean;
}

// ---------------------------------------------------------------------------
// Feature catalog (from platform)
// ---------------------------------------------------------------------------

export interface CatalogFeature {
  slug: string;
  name: string;
  description: string;
  category: string;
  minAppVersion: string;
}

// ---------------------------------------------------------------------------
// Capabilities (sent to platform during validation)
// ---------------------------------------------------------------------------

export interface Capabilities {
  licenseModule: boolean;
  settingsTable: boolean;
  aiProxy: boolean;
  gaInjection: boolean;
}
