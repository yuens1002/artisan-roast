/**
 * InactiveCard renderer contract.
 *
 * For any HydratedPlan with state.status === "INACTIVE", the renderer must:
 *   - Render plan.name as <h3>.
 *   - Render "Ended on {formatted state.deactivatedAt}".
 *   - Render state.badge.
 *   - Render the price block (sale price + crossed-out regular when salePrice set).
 *   - Render benefits.inactiveItems when set; else fall back to activeItems.
 *   - Render benefits.inactiveHeader when inactiveItems is used;
 *     else activeHeader when activeItems is used.
 *   - Render ghost action as text button; non-ghost as <Button>.
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
import { makeInactive, makePlan, renderPlans } from "./_helpers";

describe("InactiveCard contract", () => {
  test("renders plan.name + badge + Ended on subtitle", () => {
    const fixed = new Date("2026-04-01T00:00:00Z").toISOString();
    renderPlans([
      makePlan(makeInactive({ badge: "Inactive", deactivatedAt: fixed }), {
        name: "Priority Support",
      }),
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Priority Support" })).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText(/^Ended on /)).toBeInTheDocument();
  });

  test("price block shows price /mo when no sale", () => {
    renderPlans([
      makePlan(makeInactive(), { price: 4900, interval: "month" }),
    ]);
    expect(screen.getByText("$49")).toBeInTheDocument();
    expect(screen.getByText("/mo")).toBeInTheDocument();
  });

  test("price block shows salePrice + crossed-out price when salePrice set", () => {
    const { container } = renderPlans([
      makePlan(makeInactive(), { price: 4900, salePrice: 3900 }),
    ]);
    expect(screen.getByText("$39")).toBeInTheDocument();
    const crossed = container.querySelector(".line-through");
    expect(crossed).toHaveTextContent("$49");
  });

  test("inactiveItems render when present", () => {
    renderPlans([
      makePlan(makeInactive(), {
        details: {
          benefits: {
            activeItems: ["wrong"],
            inactiveItems: ["Lost A", "Lost B"],
          },
        },
      }),
    ]);
    expect(screen.getByText("Lost A")).toBeInTheDocument();
    expect(screen.getByText("Lost B")).toBeInTheDocument();
    expect(screen.queryByText("wrong")).not.toBeInTheDocument();
  });

  test("falls back to activeItems when inactiveItems is undefined", () => {
    renderPlans([
      makePlan(makeInactive(), {
        details: { benefits: { activeItems: ["Fallback A", "Fallback B"] } },
      }),
    ]);
    expect(screen.getByText("Fallback A")).toBeInTheDocument();
    expect(screen.getByText("Fallback B")).toBeInTheDocument();
  });

  test("inactiveHeader renders when inactiveItems is used", () => {
    renderPlans([
      makePlan(makeInactive(), {
        details: {
          benefits: {
            activeItems: ["x"],
            activeHeader: "What's included",
            inactiveItems: ["Lost"],
            inactiveHeader: "Renew to get back:",
          },
        },
      }),
    ]);
    expect(screen.getByText("Renew to get back:")).toBeInTheDocument();
    expect(screen.queryByText("What's included")).not.toBeInTheDocument();
  });

  test("activeHeader renders when falling back to activeItems", () => {
    renderPlans([
      makePlan(makeInactive(), {
        details: {
          benefits: { activeItems: ["x"], activeHeader: "What's included" },
        },
      }),
    ]);
    expect(screen.getByText("What's included")).toBeInTheDocument();
  });

  test("ghost + non-ghost actions render", () => {
    renderPlans([
      makePlan(
        makeInactive({
          actions: [
            { slug: "g", label: "View Details", variant: "ghost" },
            { slug: "p", label: "Renew", url: "/x", variant: "primary" },
          ],
        })
      ),
    ]);
    expect(screen.getByText("View Details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renew" })).toBeInTheDocument();
  });
});
