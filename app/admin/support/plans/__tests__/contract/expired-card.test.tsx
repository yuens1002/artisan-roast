/**
 * ExpiredCard renderer contract.
 *
 * For any HydratedPlan with state.status === "EXPIRED", the renderer must:
 *   - Render plan.name + state.badge.
 *   - Render every pool in state.pools.
 *   - Render state.statusInfo.descText (in amber accent — colour not asserted).
 *   - Render plan.details.benefits.activeItems below status info.
 *   - Render ghost + non-ghost actions.
 */
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("../../actions", () => ({ startCheckout: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("../../../actions", () => ({ refreshLicense: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("@/lib/demo", () => ({ IS_DEMO: false }));

import { screen } from "@testing-library/react";
import { makeExpired, makePlan, renderPlans } from "./_helpers";

describe("ExpiredCard contract", () => {
  test("renders plan.name and badge", () => {
    renderPlans([
      makePlan(makeExpired({ badge: "Expired" }), { name: "Trial" }),
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Trial" })).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  test("renders each pool", () => {
    renderPlans([
      makePlan(
        makeExpired({
          pools: [{ slug: "d", label: "Trial Days", used: 14, limit: 14, countLabel: "days" }],
        })
      ),
    ]);
    expect(screen.getByText("Trial Days")).toBeInTheDocument();
    expect(screen.getByText("14 / 14 days")).toBeInTheDocument();
  });

  test("renders statusInfo.descText", () => {
    renderPlans([
      makePlan(
        makeExpired({
          statusInfo: { descText: "Your 14 day trial ended. Add billing to extend up to 30 days." },
        })
      ),
    ]);
    expect(
      screen.getByText("Your 14 day trial ended. Add billing to extend up to 30 days.")
    ).toBeInTheDocument();
  });

  test("renders benefits.activeItems", () => {
    renderPlans([
      makePlan(makeExpired(), {
        details: { benefits: { activeItems: ["Item A", "Item B"] } },
      }),
    ]);
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
  });

  test("renders ghost + non-ghost actions", () => {
    renderPlans([
      makePlan(
        makeExpired({
          actions: [
            { slug: "g", label: "Delete Trial", variant: "ghost" },
            { slug: "p", label: "Add Billing", url: "/x", variant: "primary" },
          ],
        })
      ),
    ]);
    expect(screen.getByText("Delete Trial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Billing" })).toBeInTheDocument();
  });

  test("empty pools do not crash", () => {
    expect(() => renderPlans([makePlan(makeExpired({ pools: [] }))])).not.toThrow();
  });
});
