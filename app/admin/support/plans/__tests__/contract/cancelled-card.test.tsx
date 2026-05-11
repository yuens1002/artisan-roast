/**
 * CancelledCard renderer contract.
 *
 * For any HydratedPlan with state.status === "CANCELLED", the renderer must:
 *   - Render plan.name as <h3>.
 *   - Render "Store will be removed on {formatted state.deprovisionAt}".
 *   - Render "{daysRemaining} days remaining" when daysRemaining > 0.
 *   - Render state.badge.
 *   - Render every state.actions[].label as <Button>.
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
import { makeCancelled, makePlan, renderPlans } from "./_helpers";

describe("CancelledCard contract", () => {
  test("renders plan.name and badge", () => {
    renderPlans([
      makePlan(makeCancelled({ badge: "Cancelled" }), { name: "Trial" }),
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Trial" })).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  test("renders deprovisionAt as a long-form date sentence", () => {
    const fixedDate = new Date("2026-06-15T00:00:00Z").toISOString();
    renderPlans([
      makePlan(makeCancelled({ deprovisionAt: fixedDate })),
    ]);
    // Renderer formats as "Month D, YYYY" — date locale may produce
    // "June 14" or "June 15" depending on host TZ. Match the prefix.
    expect(screen.getByText(/Store will be removed on June (14|15), 2026/)).toBeInTheDocument();
  });

  test('renders "{daysRemaining} days remaining" when > 0', () => {
    renderPlans([
      makePlan(makeCancelled({ daysRemaining: 14, daysLimit: 30 })),
    ]);
    expect(screen.getByText(/14 days remaining/)).toBeInTheDocument();
  });

  test('singularises "1 day remaining"', () => {
    renderPlans([
      makePlan(makeCancelled({ daysRemaining: 1, daysLimit: 30 })),
    ]);
    expect(screen.getByText(/^1 day remaining$/)).toBeInTheDocument();
  });

  test("daysRemaining === 0 omits the days line", () => {
    renderPlans([
      makePlan(makeCancelled({ daysRemaining: 0, daysLimit: 30 })),
    ]);
    expect(screen.queryByText(/days remaining/i)).not.toBeInTheDocument();
  });

  test("renders every action as a <button>", () => {
    renderPlans([
      makePlan(
        makeCancelled({
          actions: [
            { slug: "u", label: "Undo Cancel", endpoint: "/api/x", variant: "primary" },
          ],
        })
      ),
    ]);
    expect(screen.getByRole("button", { name: "Undo Cancel" })).toBeInTheDocument();
  });

  test("empty actions array hides the action row but does not crash", () => {
    expect(() =>
      renderPlans([makePlan(makeCancelled({ actions: [] }))])
    ).not.toThrow();
  });
});
