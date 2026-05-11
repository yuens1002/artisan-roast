/**
 * ActiveCard renderer contract.
 *
 * For any HydratedPlan with state.status === "ACTIVE", the renderer must:
 *   - Render plan.name as <h3> and plan.description.
 *   - Render state.badge as a badge.
 *   - Render every state.pools[] entry as a PoolBar with:
 *       - pool.label
 *       - "{pool.used} / {pool.limit + (pool.purchased ?? 0)} {pool.countLabel}"
 *   - When at least one pool has .cta, render a 3-dot menu containing
 *     each cta.label as a menuitem.
 *   - Render every ghost action's label as a text-style button.
 *   - Render every non-ghost action's label as a <Button>.
 *   - When state.pools is empty, fall back to rendering benefits.activeItems.
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
import userEvent from "@testing-library/user-event";
import { makeActive, makePlan, renderPlans } from "./_helpers";

describe("ActiveCard contract", () => {
  test("renders plan.name and state.badge", () => {
    renderPlans([
      makePlan(makeActive({ badge: "Current Plan" }), { name: "Community" }),
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Community" })).toBeInTheDocument();
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
  });

  test("renders each pool with label and computed count", () => {
    renderPlans([
      makePlan(
        makeActive({
          pools: [
            { slug: "a", label: "Tickets", used: 2, limit: 5, countLabel: "used" },
            { slug: "b", label: "Sessions", used: 0, limit: 1, purchased: 2, countLabel: "used" },
          ],
        })
      ),
    ]);
    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(screen.getByText("2 / 5 used")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("0 / 3 used")).toBeInTheDocument(); // limit + purchased
  });

  test("pool.cta items appear in 3-dot menu", async () => {
    renderPlans([
      makePlan(
        makeActive({
          pools: [
            {
              slug: "a", label: "Tickets", used: 0, limit: 5, countLabel: "used",
              cta: { slug: "submit", label: "Submit Ticket", url: "/x", variant: "primary" },
            },
            {
              slug: "b", label: "Sessions", used: 0, limit: 1, countLabel: "used",
              cta: { slug: "book", label: "Book Session", url: "/y", variant: "secondary" },
            },
          ],
        })
      ),
    ]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /pool actions/i }));
    expect(await screen.findByRole("menuitem", { name: "Submit Ticket" })).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: "Book Session" })).toBeInTheDocument();
  });

  test("3-dot menu is absent when no pool has .cta", () => {
    renderPlans([
      makePlan(
        makeActive({
          pools: [{ slug: "a", label: "T", used: 0, limit: 1, countLabel: "used" }],
        })
      ),
    ]);
    expect(screen.queryByRole("button", { name: /pool actions/i })).not.toBeInTheDocument();
  });

  test("ghost actions render as text buttons", () => {
    renderPlans([
      makePlan(
        makeActive({ actions: [{ slug: "g", label: "View Details", variant: "ghost" }] })
      ),
    ]);
    expect(screen.getByText("View Details")).toBeInTheDocument();
  });

  test("non-ghost actions render as <button>", () => {
    renderPlans([
      makePlan(
        makeActive({
          actions: [
            { slug: "m", label: "Manage Billing", endpoint: "/api/x", variant: "secondary" },
            { slug: "c", label: "Cancel Plan", variant: "destructive" },
          ],
        })
      ),
    ]);
    expect(screen.getByRole("button", { name: "Manage Billing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Plan" })).toBeInTheDocument();
  });

  test("empty pools fall back to benefits.activeItems", () => {
    renderPlans([
      makePlan(
        makeActive({ pools: [] }),
        { details: { benefits: { activeItems: ["Item 1", "Item 2"] } } }
      ),
    ]);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  test("empty pools and empty benefits do not crash", () => {
    expect(() =>
      renderPlans([makePlan(makeActive({ pools: [] }))])
    ).not.toThrow();
  });
});
