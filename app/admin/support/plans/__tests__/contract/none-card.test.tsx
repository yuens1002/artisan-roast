/**
 * NoneCard renderer contract.
 *
 * For any HydratedPlan with state.status === "NONE", the renderer must:
 *   - Render plan.name as <h3> and plan.description.
 *   - Render the price block: "Free" when price === 0, otherwise $XX/mo.
 *   - When salePrice is set: show salePrice/mo + crossed-out price.
 *   - Render plan.details.benefits.activeItems as a list (when non-empty).
 *   - Render plan.details.benefits.activeHeader as a header (when set).
 *   - Render the ghost action's label as a text-style button.
 *   - Render every non-ghost action's label as a <Button>.
 *   - Render iconBefore / iconAfter on each non-ghost action.
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
import { makeNone, makePlan, renderPlans } from "./_helpers";

describe("NoneCard contract", () => {
  test("renders plan.name as <h3> and description", () => {
    renderPlans([makePlan(makeNone(), { name: "P", description: "Body" })]);
    expect(screen.getByRole("heading", { level: 3, name: "P" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  test('price === 0 renders "Free"', () => {
    renderPlans([makePlan(makeNone(), { price: 0 })]);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  test("price > 0 renders $XX with /mo when interval=month", () => {
    renderPlans([makePlan(makeNone(), { price: 4900, interval: "month" })]);
    expect(screen.getByText("$49")).toBeInTheDocument();
    expect(screen.getByText("/mo")).toBeInTheDocument();
  });

  test("interval=year renders /yr", () => {
    renderPlans([makePlan(makeNone(), { price: 9900, interval: "year" })]);
    expect(screen.getByText("/yr")).toBeInTheDocument();
  });

  test("salePrice shows sale price + crossed-out regular price", () => {
    const { container } = renderPlans([
      makePlan(makeNone(), { price: 4900, salePrice: 3900 }),
    ]);
    expect(screen.getByText("$39")).toBeInTheDocument();
    const crossed = container.querySelector(".line-through");
    expect(crossed).toHaveTextContent("$49");
  });

  test("saleLabel + saleEndsAt render the price label", () => {
    const future = new Date(Date.now() + 30 * 86400_000).toISOString();
    renderPlans([
      makePlan(makeNone(), {
        price: 4900,
        salePrice: 3900,
        saleLabel: "Launch Special",
        saleEndsAt: future,
      }),
    ]);
    expect(screen.getByText(/Launch Special/)).toBeInTheDocument();
    expect(screen.getByText(/offer ends/)).toBeInTheDocument();
  });

  test("benefits.activeItems each render as a list item", () => {
    renderPlans([
      makePlan(makeNone(), {
        details: { benefits: { activeItems: ["Aaa", "Bbb", "Ccc"] } },
      }),
    ]);
    for (const text of ["Aaa", "Bbb", "Ccc"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  test("benefits.activeHeader renders above the list", () => {
    renderPlans([
      makePlan(makeNone(), {
        details: { benefits: { activeHeader: "What's included", activeItems: ["x"] } },
      }),
    ]);
    expect(screen.getByText("What's included")).toBeInTheDocument();
  });

  test("ghost action label renders as text button", () => {
    renderPlans([
      makePlan(
        makeNone({ actions: [{ slug: "g", label: "View Terms", variant: "ghost" }] })
      ),
    ]);
    expect(screen.getByText("View Terms")).toBeInTheDocument();
  });

  test("non-ghost actions each render as a <button> with their label", () => {
    renderPlans([
      makePlan(
        makeNone({
          actions: [
            { slug: "p", label: "Subscribe", url: "/x", variant: "primary" },
            { slug: "s", label: "Learn More", url: "/y", variant: "secondary" },
          ],
        })
      ),
    ]);
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn More" })).toBeInTheDocument();
  });

  test("iconBefore on a non-ghost action renders an icon", () => {
    const { container } = renderPlans([
      makePlan(
        makeNone({
          actions: [
            { slug: "p", label: "Buy", iconBefore: "credit-card", url: "/x", variant: "primary" },
          ],
        })
      ),
    ]);
    const button = screen.getByRole("button", { name: /Buy/ });
    expect(button.querySelector("svg")).not.toBeNull();
    expect(container).toBeTruthy();
  });

  test("empty actions array renders without errors", () => {
    expect(() =>
      renderPlans([makePlan(makeNone({ actions: [] }))])
    ).not.toThrow();
  });
});
