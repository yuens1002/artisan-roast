/**
 * IS_DEMO guard on endpoint-only CTAs.
 *
 * Verifies that clicking an endpoint-backed action in demo mode:
 *   - Does NOT call fetch (no real mutation)
 *   - Routes checkout endpoints through the checkout/demo-bypass path
 *   - Shows a "not available" toast for non-checkout endpoints
 */
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
jest.mock("../../actions", () => ({ startCheckout: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("../../../actions", () => ({ refreshLicense: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("@/lib/demo", () => ({ IS_DEMO: true }));

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { startCheckout } from "../../actions";
import { makeNone, makePlan, renderPlans } from "./_helpers";

const toastMock = jest.fn();
const startCheckoutMock = startCheckout as jest.Mock;

let fetchMock: jest.Mock;
const originalFetch = global.fetch;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  toastMock.mockClear();
  startCheckoutMock.mockClear();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("IS_DEMO endpoint guard", () => {
  test("checkout endpoint CTA calls startCheckout and does NOT call fetch", async () => {
    const user = userEvent.setup();
    renderPlans([
      makePlan(
        makeNone({
          actions: [{ slug: "subscribe", label: "Subscribe", variant: "primary", endpoint: "/api/checkout?planSlug=priority-support" }],
        }),
        { slug: "priority-support", name: "Priority Support" }
      ),
    ]);

    await user.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(startCheckoutMock).toHaveBeenCalledTimes(1);
  });

  test("non-checkout endpoint CTA shows toast and does NOT call fetch", async () => {
    const user = userEvent.setup();
    renderPlans([
      makePlan(
        makeNone({
          actions: [{ slug: "portal", label: "Open Portal", variant: "primary", endpoint: "/api/billing/portal" }],
        }),
        { slug: "priority-support", name: "Priority Support" }
      ),
    ]);

    await user.click(screen.getByRole("button", { name: /open portal/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Not available in demo mode" })
    );
  });
});
