/**
 * TrialCard renderer contract.
 *
 * For any HydratedPlan with state.status === "TRIAL", the renderer must:
 *   - Render plan.name + state.badge.
 *   - Render every pool in state.pools as a PoolBar.
 *   - Render state.statusInfo.descText when set.
 *   - Render plan.details.benefits.activeItems below status info.
 *   - Render every ghost action as text button; non-ghost as <Button>.
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
import { makePlan, makeTrial, renderPlans } from "./_helpers";

describe("TrialCard contract", () => {
  test("renders plan.name and state.badge", () => {
    renderPlans([
      makePlan(makeTrial({ badge: "Active Trial" }), { name: "Trial Plan" }),
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Trial Plan" })).toBeInTheDocument();
    expect(screen.getByText("Active Trial")).toBeInTheDocument();
  });

  test("renders each pool with label and count", () => {
    renderPlans([
      makePlan(
        makeTrial({
          pools: [
            { slug: "trial-days", label: "Trial Days", used: 4, limit: 14, countLabel: "days" },
          ],
        })
      ),
    ]);
    expect(screen.getByText("Trial Days")).toBeInTheDocument();
    expect(screen.getByText("4 / 14 days")).toBeInTheDocument();
  });

  test("renders state.statusInfo.descText", () => {
    renderPlans([
      makePlan(
        makeTrial({ statusInfo: { descText: "Trial ends June 1, 2026" } })
      ),
    ]);
    expect(screen.getByText("Trial ends June 1, 2026")).toBeInTheDocument();
  });

  test("renders benefits.activeItems", () => {
    renderPlans([
      makePlan(makeTrial(), {
        details: { benefits: { activeItems: ["Benefit X", "Benefit Y"] } },
      }),
    ]);
    expect(screen.getByText("Benefit X")).toBeInTheDocument();
    expect(screen.getByText("Benefit Y")).toBeInTheDocument();
  });

  test("renders ghost + non-ghost actions", () => {
    renderPlans([
      makePlan(
        makeTrial({
          actions: [
            { slug: "g", label: "Cancel Trial", variant: "ghost" },
            { slug: "p", label: "Add Billing", url: "/x", variant: "primary" },
          ],
        })
      ),
    ]);
    expect(screen.getByText("Cancel Trial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Billing" })).toBeInTheDocument();
  });

  test("empty pools and no statusInfo do not crash", () => {
    expect(() => renderPlans([makePlan(makeTrial({ pools: [] }))])).not.toThrow();
  });
});
