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
  type SetupResult = { usedFakeTimers?: boolean } | null;
  type Trigger = {
    setup: () => Promise<SetupResult>;
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
        // Tell the test runner to restore real timers in its finally block.
        return { usedFakeTimers: true };
      },
    },
  ];

  test.each(TRIGGERS.map((t) => [t.name, t.setup] as const))(
    "error state surfaces on %s",
    async (_, setup) => {
      let usedFakeTimers = false;
      try {
        const result = await setup();
        usedFakeTimers = result?.usedFakeTimers ?? false;
        await waitFor(() =>
          expect(screen.getByTestId("payment-confirm-modal-error")).toBeInTheDocument()
        );
        // Same CTAs across all paths
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^close$/i })).toBeInTheDocument();
        // Same generic copy across all paths
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      } finally {
        // Restore real timers if this trigger opted into fake timers.
        // (`jest.isMockFunction(setTimeout)` is unreliable here because
        // `useFakeTimers({ doNotFake: ["setTimeout"] })` leaves setTimeout
        // un-mocked, so the gate would always fail.)
        if (usedFakeTimers) jest.useRealTimers();
      }
    }
  );
});

// ---------------------------------------------------------------------------
// Polling orchestrator (single useEffect in PlanPageClient that picks the
// cadence based on what needs watching). Replaced what used to be two
// independent pollers (modal-side 5s + card-side 10s).
//
// Cases covered:
//   (a) no PENDING + no modal       → router.refresh never called
//   (b) PENDING plan, no modal      → refresh every 10s
//   (c) modal in polling state      → refresh every 5s
// ---------------------------------------------------------------------------

describe("Polling orchestrator (cadence selection)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    refreshMock.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("(a) no PENDING + no modal → no router.refresh polling", () => {
    // NoneCard, no payment modal in flight → orchestrator returns early
    renderPage([planWithPaymentAction()]);
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("(b) PENDING plan, no modal → router.refresh fires every 10s", () => {
    renderPage([
      makePlan(makePending({ statusInfo: { descText: "Provisioning…" } }), {
        slug: "house-blend",
        name: "House Blend",
      }),
    ]);
    expect(refreshMock).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(refreshMock).toHaveBeenCalledTimes(2);
    // 5s past the next 10s tick — should NOT fire (proves it's 10s, not 5s)
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  test("(c) modal in polling state → router.refresh fires every 5s (faster cadence wins over 10s)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stripeUrl: "https://stripe.test/c/x" }),
    });
    renderPage([planWithPaymentAction()]);
    await user.click(screen.getByRole("button", { name: /subscribe/i }));
    await waitFor(() =>
      expect(screen.getByTestId("payment-confirm-modal-polling")).toBeInTheDocument()
    );
    // refreshMock might have been called once during the initial click flow
    // (we don't care about that count); reset to zero and measure the
    // orchestrator's cadence cleanly.
    refreshMock.mockClear();
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });
});

