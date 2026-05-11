/**
 * Contract-test helpers — typed factories + render helper.
 *
 * Each contract test file declares its own jest.mock(...) calls at top
 * (Jest hoists them before imports — they can't live in a helper).
 * This file only provides typed factories and the render call.
 *
 * Tests in this directory verify the renderer's data→DOM contract:
 * given any well-typed input, every typed field projects to the DOM
 * as documented. Inputs are constructed inline — no fixtures are read.
 */
import React from "react";
import { render } from "@testing-library/react";
import type {
  HydratedPlan,
  ActiveState,
  CancelledState,
  ExpiredState,
  InactiveState,
  NoneState,
  PlanState,
  TrialState,
} from "artisan-roast-sdk/plans";
import { PlanPageClient } from "../../PlanPageClient";
import type { LicenseInfo } from "@/lib/license-types";

// ---------------------------------------------------------------------------
// Default LicenseInfo — only `warnings` is read by PlanPageClient
// ---------------------------------------------------------------------------

export const mockLicense: LicenseInfo = {
  valid: true,
  tier: "FREE",
  features: [],
  trialEndsAt: null,
  managedBy: null,
  compatibility: "full",
  warnings: [],
  usage: null,
  gaConfig: { connected: false, measurementId: null, propertyName: null, lastSynced: null },
  availableActions: [],
  plan: null,
  lapsed: null,
  support: { pools: [] },
  alaCarte: [],
  legal: null,
};

// ---------------------------------------------------------------------------
// Plan factory — minimal HydratedPlan with state injected
// ---------------------------------------------------------------------------

const basePlan: Omit<HydratedPlan, "state"> = {
  slug: "test-plan",
  name: "Test Plan",
  description: "A test plan.",
  price: 0,
  currency: "USD",
  interval: "month",
  features: [],
  details: { benefits: { activeItems: [] } },
  highlight: false,
  visibility: "self-hosted",
};

export function makePlan(state: PlanState, overrides: Partial<HydratedPlan> = {}): HydratedPlan {
  return { ...basePlan, ...overrides, state };
}

// State factories — supply required fields with sensible defaults so a
// test can override only the fields it cares about.

export function makeNone(state: Partial<NoneState> = {}): NoneState {
  return { status: "NONE", actions: [], ...state };
}

export function makeActive(state: Partial<ActiveState> = {}): ActiveState {
  return { status: "ACTIVE", badge: "Active", pools: [], actions: [], ...state };
}

export function makeTrial(state: Partial<TrialState> = {}): TrialState {
  return { status: "TRIAL", badge: "Trial", pools: [], actions: [], ...state };
}

export function makeExpired(state: Partial<ExpiredState> = {}): ExpiredState {
  return { status: "EXPIRED", badge: "Expired", pools: [], actions: [], ...state };
}

export function makeCancelled(state: Partial<CancelledState> = {}): CancelledState {
  return {
    status: "CANCELLED",
    badge: "Cancelled",
    daysRemaining: 7,
    daysLimit: 30,
    deprovisionAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    actions: [],
    ...state,
  };
}

export function makeInactive(state: Partial<InactiveState> = {}): InactiveState {
  return {
    status: "INACTIVE",
    badge: "Inactive",
    deactivatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    actions: [],
    ...state,
  };
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

export function renderPlans(plans: HydratedPlan[]) {
  return render(<PlanPageClient license={mockLicense} plans={plans} />);
}
