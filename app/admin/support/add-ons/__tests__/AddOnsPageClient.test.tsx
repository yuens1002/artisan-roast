/**
 * Tests for AddOnsPageClient component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ALACARTE_SCENARIOS } from "artisan-roast-sdk/alacarte";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("../actions", () => ({
  startAlaCarteCheckout: jest.fn(),
}));

import { startAlaCarteCheckout } from "../actions";
import { AddOnsPageClient } from "../AddOnsPageClient";
import type { LicenseInfo } from "@/lib/license-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockStartAlaCarteCheckout = startAlaCarteCheckout as jest.Mock;

function makeLicense(overrides: Partial<LicenseInfo> = {}): LicenseInfo {
  const base: LicenseInfo = {
    valid: true,
    tier: "HOSTED",
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
    alaCarte: [ALACARTE_SCENARIOS.TICKETS_5, ALACARTE_SCENARIOS.SESSIONS_2],
    legal: null,
  };
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddOnsPageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders package labels and prices", () => {
    render(<AddOnsPageClient license={makeLicense()} />);

    expect(screen.getByText(ALACARTE_SCENARIOS.TICKETS_5.label)).toBeInTheDocument();
    expect(screen.getByText(ALACARTE_SCENARIOS.SESSIONS_2.label)).toBeInTheDocument();
    expect(screen.getByText(ALACARTE_SCENARIOS.TICKETS_5.price)).toBeInTheDocument();
    expect(screen.getByText(ALACARTE_SCENARIOS.SESSIONS_2.price)).toBeInTheDocument();
  });

  it("renders pools grant list for each package", () => {
    render(<AddOnsPageClient license={makeLicense()} />);

    const ticketPool = ALACARTE_SCENARIOS.TICKETS_5.pools[0];
    const sessionPool = ALACARTE_SCENARIOS.SESSIONS_2.pools[0];

    expect(
      screen.getByText(`${ticketPool.quantity} ${ticketPool.label}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${sessionPool.quantity} ${sessionPool.label}`)
    ).toBeInTheDocument();
  });

  it("renders empty state when alaCarte is empty", () => {
    render(<AddOnsPageClient license={makeLicense({ alaCarte: [] })} />);

    expect(
      screen.getByText("No add-on packages available at this time.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /purchase/i })).toBeNull();
  });

  it("calls startAlaCarteCheckout with the correct slug on purchase click", async () => {
    mockStartAlaCarteCheckout.mockResolvedValueOnce({ success: false, error: "test" });

    render(<AddOnsPageClient license={makeLicense()} />);

    const buttons = screen.getAllByRole("button", { name: /purchase/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(mockStartAlaCarteCheckout).toHaveBeenCalledTimes(1);
      const formData: FormData = mockStartAlaCarteCheckout.mock.calls[0][0];
      expect(formData.get("alaCarteSlug")).toBe(ALACARTE_SCENARIOS.TICKETS_5.id);
    });
  });
});
