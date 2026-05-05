/**
 * Plan Types
 *
 * Types for the plan catalog fetched from the platform API.
 * Used by `lib/plans.ts` and the Plan settings page.
 */

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface Plan {
  /** URL-safe plan identifier (e.g. "priority-support") */
  slug: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Price in cents (2900 = $29.00) */
  price: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Billing interval */
  interval: "month" | "year";
  /** Feature slugs included in this plan */
  features: string[];
  /** Plan details for display */
  details: PlanDetails;
  /** Whether to visually highlight this plan (e.g. "recommended") */
  highlight: boolean;
  /** Visibility discriminator — controls which build mode renders the card */
  visibility: "self-hosted" | "hosted";
  /** Optional sale price in cents (shown as current price, original struck through) */
  salePrice?: number;
  /** ISO 8601 date when the sale offer expires (e.g. "2026-04-25T00:00:00Z") */
  saleEndsAt?: string;
  /** Sale badge text (e.g. "Launch Special"). Null when no active sale. */
  saleLabel?: string;
  /** Action modal config — supplied by the platform in the plan payload. Drives
   *  the reason-capture dialog that gates any workflow (cancel, downgrade, etc.).
   *  Optional: if absent, the dialog trigger is hidden and no fallback copy is rendered.
   *  If present, all fields on ConfirmActionConfig are required (confirmIcon excepted). */
  actionModal?: ConfirmActionConfig;
}

// ---------------------------------------------------------------------------
// Confirm action config (provider-driven — platform supplies copy + reason list)
// ---------------------------------------------------------------------------

export interface ConfirmActionConfig {
  /** Dialog heading */
  heading: string;
  /** Dialog body copy */
  description: string;
  /** Reason dropdown options */
  reasons: Array<{ value: string; label: string }>;
  /** Dismiss button label (e.g. "Keep trial") */
  keepLabel: string;
  /** Confirm button label (e.g. "Cancel trial") */
  confirmLabel: string;
  /** Lucide icon name for the confirm button (e.g. "external-link"). Omit for no icon. */
  confirmIcon?: string;
}

export interface PlanDetails {
  /** SLA information */
  sla?: {
    availability?: string;
    responseTime?: string;
    videoCallBooking?: string;
    videoCallDuration?: string;
  };
  /** What the plan covers */
  scope?: string[];
  /** Billing terms and conditions */
  terms?: string[];
  /** Usage quotas */
  quotas?: Array<{ icon: string; slug: string; label: string; limit: number }>;
  /** Benefit bullet points */
  benefits?: string[];
  /** What the plan does NOT cover */
  excludes?: string[];
}

// ---------------------------------------------------------------------------
// API response
// ---------------------------------------------------------------------------

export interface PlansResponse {
  plans: Plan[];
}
