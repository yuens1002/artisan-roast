/**
 * PlanPageClient composition + payment flow integration.
 *
 * Boundaries covered (per SKILL):
 *   - Boundary 3: User click → action handler → fetch / window.open
 *   - Boundary 5: Action modalSlug → which modal opens (discriminator gate)
 *
 * ACs covered:
 *   - AC-FLOW-CLICK — sync window.open + modal mounts in preparing + endpoint
 *     call fires + transitions to polling on response
 *   - AC-MODAL-EPHEMERAL — page load with PENDING plan does NOT mount the
 *     payment modal (durable representation is PendingCard alone)
 *   - AC-CT-PAGE — discriminator gate: feedbackForm slug opens
 *     ConfirmActionDialog (not PaymentConfirmModal), and vice versa
 *   - AC-MODAL-ERROR-STATE — one parameterized test proves all three failure
 *     triggers (endpoint-fail, plan-reverted-to-NONE, stripeTab.closed)
 *     converge on the same error state
 */
const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams(""),
}));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("../../actions", () => ({
  startCheckout: jest.fn().mockResolvedValue({ success: false }),
  submitCancellation: jest.fn().mockResolvedValue({ success: false }),
}));
jest.mock("../../../actions", () => ({ refreshLicense: jest.fn().mockResolvedValue({ success: false }) }));
jest.mock("@/lib/demo", () => ({ IS_DEMO: false }));

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HydratedPlan } from "artisan-roast-sdk/plans";
import { PlanPageClient } from "../../PlanPageClient";
import {
  makeNone,
  makePending,
  makePaymentConfirmModal,
  makePlan,
  mockLicense,
  renderPlans,
} from "./_helpers";

function renderPage(plans: HydratedPlan[]) {
  return render(<PlanPageClient license={mockLicense} plans={plans} />);
}

// ---------------------------------------------------------------------------
// Test plumbing — mock fetch + window.open
// ---------------------------------------------------------------------------

type MockStripeTab = {
  location: { href: string };
  close: jest.Mock;
  closed: boolean;
};

function makeMockStripeTab(): MockStripeTab {
  return { location: { href: "" }, close: jest.fn(), closed: false };
}

let fetchMock: jest.Mock;
let windowOpenMock: jest.Mock;
let mockStripeTab: MockStripeTab;
const originalWindowOpen = global.window?.open;
const originalFetch = global.fetch;

beforeEach(() => {
  refreshMock.mockClear();
  mockStripeTab = makeMockStripeTab();
  windowOpenMock = jest.fn(() => mockStripeTab);
  fetchMock = jest.fn();
  (global as unknown as { window: Window }).window = global.window;
  global.window.open = windowOpenMock as unknown as typeof window.open;
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.window.open = originalWindowOpen as unknown as typeof window.open;
  global.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function planWithPaymentAction(): HydratedPlan {
  return makePlan(
    makeNone({
      actions: [
        {
          slug: "subscribe",
          label: "Subscribe",
          variant: "primary",
          endpoint: "/api/subscribe",
          modalSlug: "payment-confirm",
        },
      ],
    }),
    {
      slug: "priority-support",
      name: "Priority Support",
      actionModals: [
        makePaymentConfirmModal({
          slug: "payment-confirm",
          heading: "Subscribe to Priority Support",
          processingMessages: ["Confirming your payment…"],
        }),
      ],
    }
  );
}

function planWithFeedbackAction(): HydratedPlan {
  return makePlan(
    makeNone({
      actions: [
        {
          slug: "feedback",
          label: "Cancel",
          variant: "ghost",
          modalSlug: "cancel-trial",
        },
      ],
    }),
    {
      slug: "priority-support",
      actionModals: [
        {
          type: "feedbackForm",
          slug: "cancel-trial",
          heading: "Cancel your trial?",
          description: "Tell us why.",
          reasonsLabel: "Reason",
          reasons: [{ value: "too-expensive", label: "Too expensive" }],
          keepLabel: "Keep trial",
          confirmLabel: "Cancel trial",
        },
      ],
    }
  );
}

// ---------------------------------------------------------------------------
// AC-MODAL-EPHEMERAL
// ---------------------------------------------------------------------------

describe("AC-MODAL-EPHEMERAL: modal does not auto-mount on page load", () => {
  test("PENDING plan on page load renders PendingCard but NOT PaymentConfirmModal", () => {
    renderPlans([
      makePlan(makePending({ statusInfo: { descText: "Setting up your store…" } }), {
        name: "Priority Support",
      }),
    ]);
    // PendingCard present (durable representation)
    expect(screen.getByTestId("pending-card")).toBeInTheDocument();
    // Modal absent — only a click can mount it
    expect(screen.queryByTestId("payment-confirm-modal-preparing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-confirm-modal-polling")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-confirm-modal-error")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-CT-PAGE: discriminator gate
// ---------------------------------------------------------------------------

describe("AC-CT-PAGE: discriminator gate — modalSlug.type routes to the correct modal", () => {
  test("paymentConfirm action click mounts PaymentConfirmModal AND does NOT open ConfirmActionDialog", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves — stays in preparing */
        })
    );
    renderPlans([planWithPaymentAction()]);
    await user.click(screen.getByRole("button", { name: /subscribe/i }));
    expect(screen.getByTestId("payment-confirm-modal-preparing")).toBeInTheDocument();
    // ConfirmActionDialog should NOT be open — its heading is not in the DOM
    expect(screen.queryByText(/cancel your trial/i)).not.toBeInTheDocument();
  });

  test("feedbackForm action click opens ConfirmActionDialog AND does NOT mount PaymentConfirmModal", async () => {
    const user = userEvent.setup();
    renderPlans([planWithFeedbackAction()]);
    await user.click(screen.getByText("Cancel"));
    // ConfirmActionDialog opens — heading projection
    expect(await screen.findByText("Cancel your trial?")).toBeInTheDocument();
    // PaymentConfirmModal NOT mounted
    expect(screen.queryByTestId("payment-confirm-modal-preparing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-confirm-modal-polling")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-confirm-modal-error")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-FLOW-CLICK
// ---------------------------------------------------------------------------

describe("AC-FLOW-CLICK: synchronous blank tab + modal mount + endpoint call", () => {
  test("click fires window.open('about:blank', '_blank') synchronously and mounts modal in preparing", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(
      () =>
        new Promise(() => {
          /* hangs */
        })
    );
    renderPlans([planWithPaymentAction()]);

    await user.click(screen.getByRole("button", { name: /subscribe/i }));

    // window.open fired synchronously with blank URL + _blank target
    expect(windowOpenMock).toHaveBeenCalledTimes(1);
    expect(windowOpenMock).toHaveBeenCalledWith("about:blank", "_blank");
    // Modal in preparing
    expect(screen.getByTestId("payment-confirm-modal-preparing")).toBeInTheDocument();
    // Fetch was called with the endpoint URL + POST method
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/subscribe",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("endpoint success transitions modal from preparing → polling and navigates the blank tab to stripeUrl", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stripeUrl: "https://stripe.test/c/123" }),
    });
    renderPlans([planWithPaymentAction()]);
    await user.click(screen.getByRole("button", { name: /subscribe/i }));

    await waitFor(() =>
      expect(screen.getByTestId("payment-confirm-modal-polling")).toBeInTheDocument()
    );
    expect(mockStripeTab.location.href).toBe("https://stripe.test/c/123");
    expect(screen.queryByTestId("payment-confirm-modal-preparing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-confirm-modal-error")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-MODAL-ERROR-STATE: unified test.each across all three failure triggers
// ---------------------------------------------------------------------------

describe("AC-MODAL-ERROR-STATE: all failure triggers converge on the same error state", () => {
  type Trigger = {
    setup: () => Promise<unknown>;
    name: string;
  };

  const TRIGGERS: Trigger[] = [
    {
      name: "endpoint failure",
      setup: async () => {
        const user = userEvent.setup();
        fetchMock.mockRejectedValueOnce(new Error("network"));
        renderPlans([planWithPaymentAction()]);
        await user.click(screen.getByRole("button", { name: /subscribe/i }));
        return null;
      },
    },
    {
      name: "plan reverted to NONE during polling",
      setup: async () => {
        const user = userEvent.setup();
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stripeUrl: "https://stripe.test/c/x" }),
        });
        // 1) Start with NONE plan + subscribe action with paymentConfirm modal
        const nonePlan = planWithPaymentAction();
        const { rerender } = renderPage([nonePlan]);
        await user.click(screen.getByRole("button", { name: /subscribe/i }));
        await waitFor(() =>
          expect(screen.getByTestId("payment-confirm-modal-polling")).toBeInTheDocument()
        );
        // 2) Simulate the platform setting plan → PENDING after the endpoint
        //    call. Latches the seenPending guard.
        const pendingPlan = makePlan(
          makePending({ statusInfo: { descText: "Confirming…" } }),
          {
            slug: "priority-support",
            name: "Priority Support",
            actionModals: nonePlan.actionModals,
          }
        );
        rerender(<PlanPageClient license={mockLicense} plans={[pendingPlan]} />);
        // 3) Simulate the platform reverting plan → NONE after Stripe webhook
        //    fires expired/failed. Watcher detects PENDING→NONE = failure.
        rerender(<PlanPageClient license={mockLicense} plans={[nonePlan]} />);
        return null;
      },
    },
    {
      name: "stripeTab.closed detected during polling",
      setup: async () => {
        jest.useFakeTimers({ doNotFake: ["setTimeout"] });
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stripeUrl: "https://stripe.test/c/x" }),
        });
        renderPlans([planWithPaymentAction()]);
        await user.click(screen.getByRole("button", { name: /subscribe/i }));
        await waitFor(() =>
          expect(screen.getByTestId("payment-confirm-modal-polling")).toBeInTheDocument()
        );
        // Simulate user closing the Stripe tab
        mockStripeTab.closed = true;
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        return null;
      },
    },
  ];

  test.each(TRIGGERS.map((t) => [t.name, t.setup] as const))(
    "error state surfaces on %s",
    async (_, setup) => {
      try {
        await setup();
        await waitFor(() =>
          expect(screen.getByTestId("payment-confirm-modal-error")).toBeInTheDocument()
        );
        // Same CTAs across all paths
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^close$/i })).toBeInTheDocument();
        // Same generic copy across all paths
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      } finally {
        if (jest.isMockFunction(setTimeout)) jest.useRealTimers();
      }
    }
  );
});

