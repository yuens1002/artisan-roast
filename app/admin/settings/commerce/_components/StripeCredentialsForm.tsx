"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle, Circle, XCircle, Save as SaveIcon, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { IS_DEMO } from "@/lib/demo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormHeading } from "@/components/ui/forms/FormHeading";

interface StripeConfigResponse {
  envSecretSet: boolean;
  envWebhookSet: boolean;
  envPublishableSet: boolean;
  db: {
    hasRow: boolean;
    hasSecretKey: boolean;
    hasWebhookSecret: boolean;
    publishableKey: string | null;
    accountId: string | null;
    accountName: string | null;
    isTestMode: boolean | null;
    lastValidatedAt: string | null;
    decryptionError: boolean;
    secretKeyMasked: string | null;
    webhookSecretMasked: string | null;
  };
}

type SaveStep = "idle" | "verifying" | "saving" | "done" | "error";
type VerifyStep = "idle" | "verifying" | "verified" | "error";
type IconState = "none" | "muted" | "green" | "error";

function resolveIconState(
  value: string,
  dirty: boolean,
  saveStep: SaveStep,
  isVerifiedFromDb: boolean
): IconState {
  if (!value) return "none";
  if (saveStep === "error") return "error";
  if (saveStep === "done") return "green";
  if (dirty) return "muted";
  if (isVerifiedFromDb) return "green";
  return "none";
}

function FieldIcon({ state }: { state: IconState }) {
  if (state === "none") return <span className="w-4 shrink-0" />;
  if (state === "green") return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (state === "error") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  return <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />;
}

export function StripeCredentialsForm() {
  const [config, setConfig] = useState<StripeConfigResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [secretDirty, setSecretDirty] = useState(false);
  const [pubDirty, setPubDirty] = useState(false);
  const [webhookDirty, setWebhookDirty] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretFocused, setSecretFocused] = useState(false);
  const [webhookVisible, setWebhookVisible] = useState(false);
  const [webhookFocused, setWebhookFocused] = useState(false);
  const [secretRequiredError, setSecretRequiredError] = useState(false);
  const [pubRequiredError, setPubRequiredError] = useState(false);
  const [webhookRequiredError, setWebhookRequiredError] = useState(false);
  const [saveStep, setSaveStep] = useState<SaveStep>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifyStep, setVerifyStep] = useState<VerifyStep>("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/stripe", { cache: "no-store" });
      if (res.ok) {
        const data: StripeConfigResponse = await res.json();
        setConfig(data);
        if (data.db.secretKeyMasked) setSecretKey(data.db.secretKeyMasked);
        if (data.db.webhookSecretMasked) setWebhookSecret(data.db.webhookSecretMasked);
        if (data.db.publishableKey) setPublishableKey(data.db.publishableKey);
        setSecretDirty(false);
        setPubDirty(false);
        setWebhookDirty(false);
        setSecretVisible(false);
        setWebhookVisible(false);
        setVerifyStep("idle");
        setVerifyError(null);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const isTestMode = (key: string) => /^(sk|pk|rk)_test_/.test(key);
  const isLiveMode = (key: string) => /^(sk|pk|rk)_live_/.test(key);
  const secretMode = isTestMode(secretKey) ? "test" : isLiveMode(secretKey) ? "live" : null;

  const { toast } = useToast();
  const isBusy = saveStep === "verifying" || saveStep === "saving";

  const handleSave = async () => {
    const changed = { secret: secretDirty, pub: pubDirty, webhook: webhookDirty };

    if (IS_DEMO) {
      toast({ title: "Changes are disabled in demo mode.", variant: "demo" });
      return;
    }

    const db = config!.db;
    const missingSecret = !secretKey && !db.hasSecretKey;
    const missingPub = !publishableKey && !db.publishableKey;
    const missingWebhook = !webhookSecret && !db.hasWebhookSecret;

    if (missingSecret || missingPub || missingWebhook) {
      setSecretRequiredError(missingSecret);
      setPubRequiredError(missingPub);
      setWebhookRequiredError(missingWebhook);
      return;
    }

    // Clear dirty flags only after passing validation — early returns above must not wipe them
    setSecretDirty(false);
    setPubDirty(false);
    setWebhookDirty(false);
    setError(null);
    setSaveStep("verifying");
    setStepLabel("Verifying with Stripe…");
    try {
      const res = await fetch("/api/admin/settings/stripe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(changed.secret && { secretKey }),
          ...(changed.pub && { publishableKey }),
          ...(changed.webhook && { webhookSecret }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (changed.secret) setSecretDirty(true);
        if (changed.pub) setPubDirty(true);
        if (changed.webhook) setWebhookDirty(true);
        setSaveStep("error");
        setError(data.error ?? "Could not save credentials. Please try again.");
        return;
      }
      setStepLabel("Saving credentials…");
      setSaveStep("saving");
      await new Promise((r) => setTimeout(r, 400));
      await fetchConfig();
      setSaveStep("done");
      setTimeout(() => setSaveStep("idle"), 3000);
    } catch {
      setSaveStep("error");
      setError("Could not connect to server. Please try again.");
    }
  };

  const handleUndo = () => {
    if (!config?.db.hasRow) return;
    const { db } = config;
    setSecretKey(db.secretKeyMasked ?? "");
    setPublishableKey(db.publishableKey ?? "");
    setWebhookSecret(db.webhookSecretMasked ?? "");
    setSecretDirty(false);
    setPubDirty(false);
    setWebhookDirty(false);
    setSecretVisible(false);
    setWebhookVisible(false);
    setSecretRequiredError(false);
    setPubRequiredError(false);
    setWebhookRequiredError(false);
    setError(null);
    setSaveStep("idle");
    setVerifyStep("idle");
    setVerifyError(null);
  };

  const handleVerify = async () => {
    if (IS_DEMO) {
      toast({ title: "Changes are disabled in demo mode.", variant: "demo" });
      return;
    }
    setVerifyStep("verifying");
    setVerifyError(null);
    try {
      const res = await fetch("/api/admin/settings/stripe", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setVerifyStep("error");
        setVerifyError(data.error ?? "Verification failed. Please try again.");
      } else {
        setVerifyStep("verified");
        setTimeout(() => setVerifyStep("idle"), 4000);
      }
    } catch {
      setVerifyStep("error");
      setVerifyError("Could not connect to server. Please try again.");
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Stripe configuration…
      </div>
    );
  }

  if (fetchError || !config) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Could not load Stripe configuration. Refresh to try again.
      </div>
    );
  }

  const { db } = config;
  const noKeysConfigured = !db.hasRow && !config.envSecretSet;

  const modeBadge = secretMode ? (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
        secretMode === "test"
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      }`}
    >
      {secretMode === "test" ? "Test Mode" : "Live Mode"}
    </span>
  ) : undefined;

  return (
    // Single max-w constraint — all child elements inherit the same 72ch column
    <div className="space-y-6 w-full max-w-[72ch]">
      {noKeysConfigured && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Stripe is not connected — the store cannot accept payments until you add the API keys below.
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Secret Key */}
        <div className="space-y-2">
          <FormHeading
            htmlFor="stripe-secret-key"
            label="Secret Key"
            required
            isDirty={secretDirty}
            statusMessage={secretRequiredError ? "Required field" : undefined}
            statusType="required"
            action={modeBadge}
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="stripe-secret-key"
                type={secretFocused || secretDirty || secretVisible ? "text" : "password"}
                placeholder={db.hasSecretKey ? "Re-enter to change" : "sk_test_… or sk_live_…"}
                value={secretKey}
                onFocus={() => {
                  setSecretFocused(true);
                  if (!secretDirty && secretKey.startsWith("•")) setSecretKey("");
                }}
                onBlur={() => {
                  setSecretFocused(false);
                  if (!secretDirty && config?.db.secretKeyMasked) setSecretKey(config.db.secretKeyMasked);
                }}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  setSecretDirty(true);
                  setSecretRequiredError(false);
                  setError(null);
                  setSaveStep("idle");
                  setVerifyStep("idle");
                  setVerifyError(null);
                }}
                disabled={isBusy}
                className={`w-full${!secretDirty && !secretFocused && secretKey ? " pr-10" : ""}`}
              />
              {!secretDirty && !secretFocused && secretKey && (
                <button
                  type="button"
                  onClick={() => setSecretVisible((v) => !v)}
                  disabled={isBusy}
                  aria-label={secretVisible ? "Hide secret key" : "Show secret key"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            <FieldIcon state={resolveIconState(secretKey, secretDirty, saveStep, !secretDirty && db.hasSecretKey)} />
          </div>
        </div>

        {/* Publishable Key */}
        <div className="space-y-2">
          <FormHeading
            htmlFor="stripe-publishable-key"
            label="Publishable Key"
            required
            isDirty={pubDirty}
            statusMessage={pubRequiredError ? "Required field" : undefined}
            statusType="required"
          />
          <div className="flex items-center gap-2">
            <Input
              id="stripe-publishable-key"
              type="text"
              placeholder="pk_test_… or pk_live_…"
              value={publishableKey}
              onChange={(e) => {
                setPublishableKey(e.target.value);
                setPubDirty(true);
                setPubRequiredError(false);
                setError(null);
                setSaveStep("idle");
                setVerifyStep("idle");
                setVerifyError(null);
              }}
              disabled={isBusy}
              className="flex-1"
            />
            <FieldIcon state={resolveIconState(publishableKey, pubDirty, saveStep, !pubDirty && !!db.publishableKey)} />
          </div>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-2">
          <FormHeading
            htmlFor="stripe-webhook-secret"
            label="Webhook Secret"
            required
            isDirty={webhookDirty}
            statusMessage={webhookRequiredError ? "Required field" : undefined}
            statusType="required"
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="stripe-webhook-secret"
                type={webhookFocused || webhookDirty || webhookVisible ? "text" : "password"}
                placeholder={db.hasWebhookSecret ? "Re-enter to change" : "whsec_…"}
                value={webhookSecret}
                onFocus={() => {
                  setWebhookFocused(true);
                  if (!webhookDirty && webhookSecret.startsWith("•")) setWebhookSecret("");
                }}
                onBlur={() => {
                  setWebhookFocused(false);
                  if (!webhookDirty && config?.db.webhookSecretMasked) setWebhookSecret(config.db.webhookSecretMasked);
                }}
                onChange={(e) => {
                  setWebhookSecret(e.target.value);
                  setWebhookDirty(true);
                  setWebhookRequiredError(false);
                  setError(null);
                  setSaveStep("idle");
                  setVerifyStep("idle");
                  setVerifyError(null);
                }}
                disabled={isBusy}
                className={`w-full${!webhookDirty && !webhookFocused && webhookSecret ? " pr-10" : ""}`}
              />
              {!webhookDirty && !webhookFocused && webhookSecret && (
                <button
                  type="button"
                  onClick={() => setWebhookVisible((v) => !v)}
                  disabled={isBusy}
                  aria-label={webhookVisible ? "Hide webhook secret" : "Show webhook secret"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {webhookVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            <FieldIcon state={resolveIconState(webhookSecret, webhookDirty, saveStep, !webhookDirty && db.hasWebhookSecret)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Required to receive order confirmations from Stripe.
          </p>
        </div>

        {/* Action button + inline status */}
        <div className="flex items-center gap-3">
          {db.hasRow && db.hasSecretKey && (
            <Button
              variant="outline"
              onClick={handleVerify}
              disabled={isBusy || verifyStep === "verifying" || saveStep === "error" || secretDirty || pubDirty || webhookDirty}
            >
              {verifyStep === "verifying" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              {verifyStep === "verifying" ? "Verifying" : "Verify"}
            </Button>
          )}
          {saveStep === "error" && db.hasRow && db.hasSecretKey ? (
            <Button variant="outline" onClick={handleUndo} disabled={isBusy}>
              Undo Changes
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isBusy}>
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 h-4 w-4" />
              )}
              {isBusy ? "Saving" : "Save"}
            </Button>
          )}
          <span className="ml-auto text-sm text-right">
            {isBusy && (
              <span className="flex flex-col items-end text-muted-foreground">
                <span>{stepLabel}</span>
                <span className="text-xs">This may take a few seconds — hang tight.</span>
              </span>
            )}
            {!isBusy && saveStep === "done" && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Saved successfully.
              </span>
            )}
            {!isBusy && saveStep === "error" && error && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </span>
            )}
            {!isBusy && saveStep === "idle" && verifyStep === "verifying" && (
              <span className="text-muted-foreground">Verifying connectivity…</span>
            )}
            {!isBusy && saveStep === "idle" && verifyStep === "verified" && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                All checks passed.
              </span>
            )}
            {!isBusy && saveStep === "idle" && verifyStep === "error" && verifyError && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {verifyError}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
