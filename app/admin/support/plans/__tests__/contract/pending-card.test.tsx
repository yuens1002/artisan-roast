/**
 * PendingCard renderer contract.
 *
 * For any HydratedPlan with state.status === "PENDING", the renderer must:
 *   - Mount with data-testid="pending-card".
 *   - Render plan.name as <h3>.
 *   - Project state.statusInfo.descText into the description slot
 *     (replacing plan.description) with role="status" for screen readers.
 *   - Render the hard-coded "Pending" badge (with Hourglass icon) in the
 *     top-right slot. Universal store-side display — no SDK / resolver
 *     involvement.
 *   - Render the price section + benefits list, same as NoneCard.
 *   - Render a single "View Details" ghost CTA linking to
 *     /admin/support/plans/${plan.slug}. Hard-coded today; iterating
 *     state.actions lands when platform PR-PENDING-ACTIONS ships.
 *   - Render confirming-payment and provisioning substates identically —
 *     the only DOM difference is the descText text node.
 *
 * Conventions per .claude/skills/test-engineer/SKILL.md:
 *   - Probe strings for projected fields (PROBE_*).
 *   - data-testid for the card + badge; role queries for buttons.
 *   - Presence + absence assertions paired.
 */
// Stable router-push mock so View Details navigation can be asserted.
// (`mock`-prefix exception lets us reference it inside the jest.mock factory
// despite Jest's hoist semantics.)
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("../../actions", () => ({ startCheckout: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("../../../actions", () => ({ refreshLicense: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("@/lib/demo", () => ({ IS_DEMO: false }));

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makePending, makePlan, renderPlans } from "./_helpers";

beforeEach(() => mockPush.mockClear());

describe("PendingCard contract", () => {
  test("mounts with pending-card testid and renders plan name as <h3>", () => {
    renderPlans([makePlan(makePending(), { name: "PROBE_NAME" })]);
    const card = screen.getByTestId("pending-card");
    expect(card).toBeInTheDocument();
    expect(within(card).getByRole("heading", { level: 3, name: "PROBE_NAME" })).toBeInTheDocument();
  });

  test("hard-coded 'Pending' badge with Hourglass icon renders in top-right", () => {
    renderPlans([makePlan(makePending())]);
    const card = screen.getByTestId("pending-card");
    const badge = within(card).getByTestId("pending-badge");
    expect(badge).toHaveTextContent("Pending");
    // Icon is a Lucide <svg> child of the badge — presence-only assertion.
    expect(badge.querySelector("svg")).not.toBeNull();
  });

  test("description slot is statusInfo.descText, NOT plan.description (probe-asserted)", () => {
    renderPlans([
      makePlan(makePending({ statusInfo: { descText: "PROBE_STATUS_DESC" } }), {
        name: "Plan",
        description: "PROBE_PLAN_DESC",
      }),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("PROBE_STATUS_DESC")).toBeInTheDocument();
    expect(within(card).queryByText("PROBE_PLAN_DESC")).not.toBeInTheDocument();
    // Accessibility: status region for screen readers
    expect(within(card).getByRole("status")).toHaveTextContent("PROBE_STATUS_DESC");
  });

  test("absent statusInfo: no role=status region in the card", () => {
    renderPlans([makePlan(makePending({ statusInfo: undefined }))]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).queryByRole("status")).not.toBeInTheDocument();
  });

  test("price section: paid plan renders price + interval", () => {
    renderPlans([
      makePlan(makePending(), { name: "PS", price: 4900, currency: "USD", interval: "month" }),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("$49")).toBeInTheDocument();
    expect(within(card).getByText("/mo")).toBeInTheDocument();
  });

  test("price section: free plan hides the price block entirely", () => {
    renderPlans([makePlan(makePending(), { price: 0 })]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).queryByText("$0")).not.toBeInTheDocument();
    expect(within(card).queryByText("Free")).not.toBeInTheDocument();
  });

  test("benefits list renders from plan.details.benefits.activeItems", () => {
    renderPlans([
      makePlan(makePending(), {
        details: {
          benefits: {
            activeHeader: "PROBE_HEADER",
            activeItems: ["PROBE_BENEFIT_1", "PROBE_BENEFIT_2"],
          },
        },
      }),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("PROBE_HEADER")).toBeInTheDocument();
    expect(within(card).getByText("PROBE_BENEFIT_1")).toBeInTheDocument();
    expect(within(card).getByText("PROBE_BENEFIT_2")).toBeInTheDocument();
  });

  test("View Details ghost CTA navigates to PlanCard's detailHref (paid plan → /admin/support/plans/{slug})", async () => {
    const user = userEvent.setup();
    renderPlans([makePlan(makePending(), { slug: "priority-support", price: 4900 })]);
    const card = screen.getByTestId("pending-card");
    const button = within(card).getByRole("button", { name: /view details/i });
    expect(button).toBeInTheDocument();
    await user.click(button);
    // Navigation goes through PlanCard's detailHref (computed once, threaded
    // as a prop), not a hard-coded URL inside PendingCard.
    expect(mockPush).toHaveBeenCalledWith("/admin/support/plans/priority-support");
  });

  test("View Details navigates to terms when the plan is free (matches PlanCard's detailHref logic)", async () => {
    const user = userEvent.setup();
    renderPlans([makePlan(makePending(), { slug: "community", price: 0 })]);
    const card = screen.getByTestId("pending-card");
    await user.click(within(card).getByRole("button", { name: /view details/i }));
    expect(mockPush).toHaveBeenCalledWith("/admin/terms/terms-of-service");
  });

  test("state.actions is intentionally NOT iterated (current renderer behavior; TODO PR-PENDING-ACTIONS)", () => {
    renderPlans([
      makePlan(
        makePending({
          // Even if the resolver/SDK ships actions today, the renderer ignores
          // them for PENDING per the current spec — proves the "no Check
          // Status today" gate until the platform PR ships.
          actions: [
            { slug: "old-check-status", label: "PROBE_ACTION_LABEL", variant: "primary", endpoint: "/x" },
          ],
        })
      ),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).queryByRole("button", { name: /PROBE_ACTION_LABEL/ })).not.toBeInTheDocument();
  });
});

describe("PendingCard substates render identically (AC-PENDING-SUBSTATES)", () => {
  // Both substates differ only in resolver-supplied statusInfo.descText.
  // The renderer must have no frontend branching on the substate value.

  function renderSubstate(descText: string) {
    return renderPlans([
      makePlan(
        makePending({ statusInfo: { descText } }),
        { name: "House Blend", description: "Hosted plan.", price: 4900 }
      ),
    ]);
  }

  test("confirming-payment probe present, provisioning probe absent", () => {
    renderSubstate("PROBE_CONFIRMING_42");
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("PROBE_CONFIRMING_42")).toBeInTheDocument();
    expect(within(card).queryByText("PROBE_PROVISIONING_42")).not.toBeInTheDocument();
  });

  test("provisioning probe present, confirming-payment probe absent", () => {
    renderSubstate("PROBE_PROVISIONING_42");
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("PROBE_PROVISIONING_42")).toBeInTheDocument();
    expect(within(card).queryByText("PROBE_CONFIRMING_42")).not.toBeInTheDocument();
  });

  test("structural equivalence: same testids, same badge, same button count, same role=status placement", () => {
    const { container: cardA } = renderSubstate("PROBE_A");
    const { container: cardB } = renderSubstate("PROBE_B");

    expect(cardA.querySelectorAll('[data-testid="pending-card"]')).toHaveLength(1);
    expect(cardB.querySelectorAll('[data-testid="pending-card"]')).toHaveLength(1);

    expect(cardA.querySelectorAll('[data-testid="pending-badge"]')).toHaveLength(1);
    expect(cardB.querySelectorAll('[data-testid="pending-badge"]')).toHaveLength(1);

    const buttonsA = cardA.querySelector('[data-testid="pending-card"]')!.querySelectorAll("button");
    const buttonsB = cardB.querySelector('[data-testid="pending-card"]')!.querySelectorAll("button");
    expect(buttonsA.length).toEqual(buttonsB.length);

    const statusA = cardA.querySelector('[role="status"]');
    const statusB = cardB.querySelector('[role="status"]');
    expect(statusA).not.toBeNull();
    expect(statusB).not.toBeNull();

    expect(statusA!.textContent).toContain("PROBE_A");
    expect(statusA!.textContent).not.toContain("PROBE_B");
    expect(statusB!.textContent).toContain("PROBE_B");
    expect(statusB!.textContent).not.toContain("PROBE_A");
  });
});
