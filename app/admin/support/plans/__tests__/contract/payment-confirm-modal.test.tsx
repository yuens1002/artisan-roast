/**
 * PaymentConfirmModal contract — pure presentational component.
 *
 * Three states: preparing / polling / error. The modal receives all of state,
 * modal-config, onRetry, onClose as props and renders the dialog accordingly.
 * State transitions are driven by the parent (PlanPageClient) — those are
 * tested separately in plan-page-client.test.tsx via the integration flow.
 *
 * Conventions per .claude/skills/test-engineer/SKILL.md:
 *   - data-testid="payment-confirm-modal-{state}" for sub-state discrimination.
 *   - Probe strings for projected SDK fields.
 *   - Presence + absence assertion pairs on every state test.
 */
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("../../actions", () => ({ startCheckout: jest.fn(), submitCancellation: jest.fn() }));
jest.mock("../../../actions", () => ({ refreshLicense: jest.fn() }));
jest.mock("@/lib/demo", () => ({ IS_DEMO: false }));

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentConfirmModal } from "../../_components/PaymentConfirmModal";
import { makePaymentConfirmModal } from "./_helpers";

describe("PaymentConfirmModal contract", () => {
  describe("closed (state=null)", () => {
    test("renders nothing", () => {
      render(
        <PaymentConfirmModal
          state={null}
          modal={null}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("payment-confirm-modal-preparing")).not.toBeInTheDocument();
      expect(screen.queryByTestId("payment-confirm-modal-polling")).not.toBeInTheDocument();
      expect(screen.queryByTestId("payment-confirm-modal-error")).not.toBeInTheDocument();
    });
  });

  describe("preparing", () => {
    test("renders preparing testid, heading from modal config, 'Preparing your checkout…' copy", () => {
      render(
        <PaymentConfirmModal
          state="preparing"
          modal={makePaymentConfirmModal({ heading: "PROBE_HEADING_PREP" })}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("payment-confirm-modal-preparing")).toBeInTheDocument();
      expect(screen.getByText("PROBE_HEADING_PREP")).toBeInTheDocument();
      expect(screen.getByTestId("payment-confirm-modal-body")).toHaveTextContent(
        "Preparing your checkout"
      );
    });

    test("no other state testids, no CTAs, no 'keep window open' copy", () => {
      render(
        <PaymentConfirmModal
          state="preparing"
          modal={makePaymentConfirmModal()}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.queryByTestId("payment-confirm-modal-polling")).not.toBeInTheDocument();
      expect(screen.queryByTestId("payment-confirm-modal-error")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^close$/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/keep this window open/i)).not.toBeInTheDocument();
    });
  });

  describe("polling", () => {
    test("renders polling testid, heading, first processingMessage, 'keep window open' copy", () => {
      render(
        <PaymentConfirmModal
          state="polling"
          modal={makePaymentConfirmModal({
            heading: "PROBE_HEADING_POLL",
            processingMessages: ["PROBE_MSG_FIRST"],
          })}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("payment-confirm-modal-polling")).toBeInTheDocument();
      expect(screen.getByText("PROBE_HEADING_POLL")).toBeInTheDocument();
      expect(screen.getByText("PROBE_MSG_FIRST")).toBeInTheDocument();
      expect(screen.getByText(/keep this window open/i)).toBeInTheDocument();
    });

    test("no other state testids, no CTAs, no 'Preparing' copy", () => {
      render(
        <PaymentConfirmModal
          state="polling"
          modal={makePaymentConfirmModal({ processingMessages: ["PROBE_MSG_X"] })}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.queryByTestId("payment-confirm-modal-preparing")).not.toBeInTheDocument();
      expect(screen.queryByTestId("payment-confirm-modal-error")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/preparing your checkout/i)).not.toBeInTheDocument();
    });

    test("cycles through processingMessages every ~2.5s while in polling state", () => {
      jest.useFakeTimers();
      try {
        render(
          <PaymentConfirmModal
            state="polling"
            modal={makePaymentConfirmModal({
              processingMessages: ["PROBE_MSG_A", "PROBE_MSG_B"],
            })}
            onRetry={jest.fn()}
            onClose={jest.fn()}
          />
        );
        expect(screen.getByText("PROBE_MSG_A")).toBeInTheDocument();
        expect(screen.queryByText("PROBE_MSG_B")).not.toBeInTheDocument();

        act(() => {
          jest.advanceTimersByTime(2500);
        });
        expect(screen.getByText("PROBE_MSG_B")).toBeInTheDocument();
        expect(screen.queryByText("PROBE_MSG_A")).not.toBeInTheDocument();

        act(() => {
          jest.advanceTimersByTime(2500);
        });
        // Cycles back to first
        expect(screen.getByText("PROBE_MSG_A")).toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("SDK-driven description (modal.description)", () => {
    test.each(["preparing", "polling", "error"] as const)(
      "renders modal.description in DialogDescription slot when state=%s",
      (state) => {
        render(
          <PaymentConfirmModal
            state={state}
            modal={makePaymentConfirmModal({
              description: "PROBE_DESC_STANDARD_PLAN_29_USD",
            })}
            onRetry={jest.fn()}
            onClose={jest.fn()}
          />
        );
        expect(
          screen.getByTestId("payment-confirm-modal-description")
        ).toHaveTextContent("PROBE_DESC_STANDARD_PLAN_29_USD");
      }
    );

    test("absent description: preparing/polling render no DialogDescription; error falls back to generic error copy", () => {
      const { rerender } = render(
        <PaymentConfirmModal
          state="preparing"
          modal={makePaymentConfirmModal()}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(
        screen.queryByTestId("payment-confirm-modal-description")
      ).not.toBeInTheDocument();

      rerender(
        <PaymentConfirmModal
          state="error"
          modal={makePaymentConfirmModal()}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      // Fallback DialogDescription with the generic error copy
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(
        screen.queryByTestId("payment-confirm-modal-description")
      ).not.toBeInTheDocument();
    });
  });

  describe("error", () => {
    test("renders error testid, generic copy, Try Again + Close CTAs", () => {
      render(
        <PaymentConfirmModal
          state="error"
          modal={makePaymentConfirmModal({ heading: "PROBE_HEADING_ERR" })}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("payment-confirm-modal-error")).toBeInTheDocument();
      expect(screen.getByText("PROBE_HEADING_ERR")).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^close$/i })).toBeInTheDocument();
    });

    test("no other state testids, no spinner copy, no 'keep window open' copy", () => {
      render(
        <PaymentConfirmModal
          state="error"
          modal={makePaymentConfirmModal()}
          onRetry={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.queryByTestId("payment-confirm-modal-preparing")).not.toBeInTheDocument();
      expect(screen.queryByTestId("payment-confirm-modal-polling")).not.toBeInTheDocument();
      expect(screen.queryByText(/preparing your checkout/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/keep this window open/i)).not.toBeInTheDocument();
    });

    test("Try Again click invokes onRetry; Close click invokes onClose", async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();
      const onClose = jest.fn();
      render(
        <PaymentConfirmModal
          state="error"
          modal={makePaymentConfirmModal()}
          onRetry={onRetry}
          onClose={onClose}
        />
      );
      await user.click(screen.getByRole("button", { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /^close$/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
