/**
 * PendingCard renderer contract.
 *
 * For any HydratedPlan with state.status === "PENDING", the renderer must:
 *   - Mount with data-testid="pending-card".
 *   - Render plan.name as <h3> and plan.description.
 *   - Project state.statusInfo.descText verbatim (probe-asserted).
 *   - Render every state.actions[] entry as a <button> with its label.
 *   - Render confirming-payment and provisioning substates identically —
 *     the only DOM difference is the descText text node.
 *
 * Conventions per .claude/skills/test-engineer/SKILL.md:
 *   - Probe strings for projected fields (PROBE_*), not realistic copy.
 *   - data-testid for the card; role queries for buttons.
 *   - Presence + absence assertions paired.
 */
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("../../actions", () => ({ startCheckout: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("../../../actions", () => ({ refreshLicense: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("@/lib/demo", () => ({ IS_DEMO: false }));

import { screen, within } from "@testing-library/react";
import { makePending, makePlan, renderPlans } from "./_helpers";

describe("PendingCard contract", () => {
  test("mounts with pending-card testid and projects name + description", () => {
    renderPlans([
      makePlan(makePending(), {
        name: "PROBE_NAME",
        description: "PROBE_DESCRIPTION",
      }),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(card).toBeInTheDocument();
    expect(within(card).getByRole("heading", { level: 3, name: "PROBE_NAME" })).toBeInTheDocument();
    expect(within(card).getByText("PROBE_DESCRIPTION")).toBeInTheDocument();
  });

  test("projects statusInfo.descText verbatim", () => {
    renderPlans([
      makePlan(makePending({ statusInfo: { descText: "PROBE_DESC_42" } })),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("PROBE_DESC_42")).toBeInTheDocument();
    // The status copy region has role=status for screen readers
    expect(within(card).getByRole("status")).toHaveTextContent("PROBE_DESC_42");
  });

  test("renders each state.actions entry as a button with the action label", () => {
    renderPlans([
      makePlan(
        makePending({
          actions: [
            { slug: "check-status", label: "PROBE_ACTION_LABEL", variant: "primary", endpoint: "/x" },
          ],
        })
      ),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByRole("button", { name: /PROBE_ACTION_LABEL/ })).toBeInTheDocument();
  });

  test("empty actions: no buttons inside the card", () => {
    renderPlans([
      makePlan(makePending({ actions: [] })),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).queryAllByRole("button")).toHaveLength(0);
  });

  test("absent statusInfo: no role=status region in the card", () => {
    renderPlans([
      makePlan(makePending({ statusInfo: undefined })),
    ]);
    const card = screen.getByTestId("pending-card");
    expect(within(card).queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("PendingCard substates render identically (AC-PENDING-SUBSTATES)", () => {
  // Both substates differ only in resolver-supplied statusInfo.descText.
  // The renderer must have no frontend branching on the substate value.
  // We prove this structurally: same testids, same number of buttons,
  // same role=status placement; only the text node differs.

  const ACTIONS = [
    { slug: "check-status", label: "Check Status", variant: "primary" as const, endpoint: "/x" },
  ];

  function renderSubstate(descText: string) {
    return renderPlans([
      makePlan(
        makePending({
          statusInfo: { descText },
          actions: ACTIONS,
        }),
        { name: "Probe Plan", description: "A description." }
      ),
    ]);
  }

  test("confirming-payment substate renders only its own probe; provisioning probe absent", () => {
    renderSubstate("PROBE_CONFIRMING_42");
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("PROBE_CONFIRMING_42")).toBeInTheDocument();
    expect(within(card).queryByText("PROBE_PROVISIONING_42")).not.toBeInTheDocument();
  });

  test("provisioning substate renders only its own probe; confirming-payment probe absent", () => {
    renderSubstate("PROBE_PROVISIONING_42");
    const card = screen.getByTestId("pending-card");
    expect(within(card).getByText("PROBE_PROVISIONING_42")).toBeInTheDocument();
    expect(within(card).queryByText("PROBE_CONFIRMING_42")).not.toBeInTheDocument();
  });

  test("structural equivalence across substates: same testid count, same button count, same role=status placement", () => {
    const { container: cardA } = renderSubstate("PROBE_A");
    const { container: cardB } = renderSubstate("PROBE_B");

    // Same testids present in both
    expect(cardA.querySelectorAll('[data-testid="pending-card"]')).toHaveLength(1);
    expect(cardB.querySelectorAll('[data-testid="pending-card"]')).toHaveLength(1);

    // Same number of buttons inside the card
    const buttonsA = cardA.querySelector('[data-testid="pending-card"]')!.querySelectorAll("button");
    const buttonsB = cardB.querySelector('[data-testid="pending-card"]')!.querySelectorAll("button");
    expect(buttonsA.length).toEqual(buttonsB.length);

    // Same role=status placement
    const statusA = cardA.querySelector('[role="status"]');
    const statusB = cardB.querySelector('[role="status"]');
    expect(statusA).not.toBeNull();
    expect(statusB).not.toBeNull();

    // The probe strings are mutually exclusive across the two renders
    expect(statusA!.textContent).toContain("PROBE_A");
    expect(statusA!.textContent).not.toContain("PROBE_B");
    expect(statusB!.textContent).toContain("PROBE_B");
    expect(statusB!.textContent).not.toContain("PROBE_A");
  });
});
