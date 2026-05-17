"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PaymentConfirmModal as PaymentConfirmModalConfig } from "artisan-roast-sdk/plans";

// ---------------------------------------------------------------------------
// Public state machine
// ---------------------------------------------------------------------------
//
// - "preparing" — click handler fired. The platform endpoint is creating the
//   Stripe session; we have a blank tab open but no URL yet. Spinner + the
//   hard-coded copy "Preparing your checkout…". Non-dismissable.
// - "polling"   — endpoint returned, Stripe tab navigated. We're now watching
//   the plan's state (driven by router.refresh polling in the parent). Spinner
//   + cycling processingMessages + "keep window open" line. Non-dismissable.
// - "error"     — any failure path converges here: endpoint failed/timed out,
//   plan reverted to NONE while polling, or the Stripe tab was closed. Single
//   generic copy + Try Again (primary) and Close (ghost) CTAs.
//
// Transitions are driven by the parent (PlanPageClient), which observes
// plan state and stripeTab.closed via useEffects and feeds the result down
// via the `state` prop. This component is purely presentational.
// ---------------------------------------------------------------------------

export type PaymentModalState = "preparing" | "polling" | "error";

interface PaymentConfirmModalProps {
  /** Current state of the modal; null when the modal is closed. */
  state: PaymentModalState | null;
  /** SDK modal config — heading + processingMessages. null when closed. */
  modal: PaymentConfirmModalConfig | null;
  /** Called when the user clicks Try Again on the error state. */
  onRetry: () => void;
  /** Called when the user clicks Close on the error state. */
  onClose: () => void;
}

const PROCESSING_MESSAGE_INTERVAL_MS = 2500;

export function PaymentConfirmModal({
  state,
  modal,
  onRetry,
  onClose,
}: PaymentConfirmModalProps) {
  if (!state || !modal) return null;

  // The processing-message cycling lives in a child keyed by `state` so the
  // component remounts (and `messageIdx` resets) cleanly whenever we enter
  // or leave the polling phase — no effect-internal reset, no eslint-disable.
  return (
    <PaymentConfirmModalDialog
      key={state}
      state={state}
      modal={modal}
      onRetry={onRetry}
      onClose={onClose}
    />
  );
}

function PaymentConfirmModalDialog({
  state,
  modal,
  onRetry,
  onClose,
}: {
  state: PaymentModalState;
  modal: PaymentConfirmModalConfig;
  onRetry: () => void;
  onClose: () => void;
}) {
  // Cycle through processingMessages while in polling state. `messageIdx`
  // starts at 0 on every mount, and the parent's `key={state}` ensures a
  // fresh mount each time we re-enter polling.
  const [messageIdx, setMessageIdx] = useState(0);

  useEffect(() => {
    if (state !== "polling") return;
    if (modal.processingMessages.length <= 1) return;

    const id = setInterval(() => {
      setMessageIdx((i) => (i + 1) % modal.processingMessages.length);
    }, PROCESSING_MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state, modal.processingMessages]);

  // Non-dismissable in preparing + polling. In error, the user has explicit
  // Close + Try Again CTAs, but Escape/overlay-click are still disabled so
  // the user reads the error before acting.
  const preventDismiss = (e: Event) => e.preventDefault();

  return (
    <Dialog open onOpenChange={() => { /* dismissal is CTA-driven only */ }}>
      <DialogContent
        data-testid={`payment-confirm-modal-${state}`}
        showCloseButton={false}
        onEscapeKeyDown={preventDismiss}
        onPointerDownOutside={preventDismiss}
        onInteractOutside={preventDismiss}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{modal.heading}</DialogTitle>
          {modal.description ? (
            <DialogDescription data-testid="payment-confirm-modal-description">
              {modal.description}
            </DialogDescription>
          ) : (
            // Fallback so Radix has an accessible description and the error
            // state still indicates failure when the SDK payload omits one.
            state === "error" && (
              <DialogDescription>
                Something went wrong. Please try again or close this dialog.
              </DialogDescription>
            )
          )}
        </DialogHeader>

        {(state === "preparing" || state === "polling") && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {/* role=status + aria-live='polite' — announces the body copy
                changes (preparing → polling → cycling messages) to screen
                readers without interrupting the user's current focus. */}
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground text-center"
              data-testid="payment-confirm-modal-body"
            >
              {state === "preparing"
                ? "Preparing your checkout…"
                : modal.processingMessages[messageIdx] ??
                  modal.processingMessages[0] ??
                  "Confirming your payment…"}
            </p>
            {state === "polling" && (
              <p className="text-xs text-muted-foreground text-center mt-1">
                Please keep this window open while we confirm your payment.
              </p>
            )}
          </div>
        )}

        {state === "error" && (
          <>
            {modal.description && (
              // Description above slot the SDK-driven copy; the error body
              // line below is the universal failure indicator for this state.
              <p className="text-sm text-muted-foreground text-center py-2">
                Something went wrong. Please try again or close this dialog.
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button onClick={onRetry}>Try Again</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
