"use client";

import { useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { submitCancellation } from "../actions";

// ---------------------------------------------------------------------------
// Reason options — final list locked here; matches the dialog spec in
// docs/features/hosting-extension/trial-ui-plan.md.
// ---------------------------------------------------------------------------

const REASON_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "too-expensive", label: "Too expensive" },
  { value: "missing-features", label: "Missing features" },
  { value: "switching", label: "Switching to another platform" },
  { value: "no-longer-needed", label: "Don't need it anymore" },
  { value: "other", label: "Other" },
];

const OTHER_TEXT_MAX = 500;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CancelTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the customer has billing on file — flow redirects to
   *  Stripe Portal. When false, a UI-mock cancel is captured client-side. */
  cardAdded: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CancelTrialDialog({
  open,
  onOpenChange,
  cardAdded,
}: CancelTrialDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<string>("");
  const [otherText, setOtherText] = useState<string>("");

  const variant = cardAdded ? "card-added" : "no-card";
  const heading = cardAdded ? "Cancel your subscription?" : "Cancel your trial?";
  const description = cardAdded
    ? "We'll redirect you to Stripe to complete cancellation. Tell us why first — your feedback helps us improve."
    : "Your trial will be cancelled and your store deprovisioned. Tell us why before you go — your feedback helps us improve.";
  const keepLabel = cardAdded ? "Keep subscription" : "Keep trial";
  const confirmLabel = cardAdded ? "Continue to Stripe →" : "Cancel trial";

  function reset() {
    setReason("");
    setOtherText("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!reason) return;
    if (reason === "other" && otherText.trim().length === 0) {
      toast({
        title: "Tell us a bit more",
        description: "Please add a reason in the text box, or pick another option.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await submitCancellation({
        reason,
        otherText: reason === "other" ? otherText.trim() : undefined,
        variant,
      });

      if (!result.success) {
        toast({
          title: "Could not submit cancellation",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.portalUrl) {
        // Card-added variant: open Stripe Portal in a new tab and close.
        window.open(result.portalUrl, "_blank", "noopener,noreferrer");
        handleOpenChange(false);
        return;
      }

      // No-card variant: UI mock confirms.
      toast({
        title: cardAdded
          ? "Cancellation request received"
          : "Trial cancellation request received",
      });
      handleOpenChange(false);
    });
  }

  const showOtherTextarea = reason === "other";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancelling</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="cancel-reason">
                <SelectValue placeholder="Pick a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showOtherTextarea && (
            <div className="space-y-2">
              <Label htmlFor="cancel-other">Tell us a bit more</Label>
              <Textarea
                id="cancel-other"
                placeholder="What are we missing?"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                maxLength={OTHER_TEXT_MAX}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {otherText.length} / {OTHER_TEXT_MAX}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {keepLabel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || isPending}
            variant={cardAdded ? "default" : "destructive"}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
