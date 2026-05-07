"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { activateLicense, refreshLicense } from "../actions";
import { DownloadDataCard } from "./_components/DownloadDataCard";
import type { LicenseInfo } from "@/lib/license-types";
import type { Plan } from "artisan-roast-sdk/plans";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TermsPageClientProps {
  license: LicenseInfo;
  hasKey: boolean;
  rawKey: string;
  plans: Plan[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return key.slice(0, 7) + "••••" + key.slice(-4);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TermsPageClient({
  license: initialLicense,
  hasKey: initialHasKey,
  rawKey: initialRawKey,
  plans,
}: TermsPageClientProps) {
  return (
    <div className="max-w-5xl space-y-8">
      <PageTitle
        title="License & Privacy"
        subtitle="License key and data privacy settings"
      />

      <Tabs defaultValue="license">
        <TabsList>
          <TabsTrigger value="license">License</TabsTrigger>
          <TabsTrigger value="privacy">Data Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="license" className="space-y-6 pt-6">
          <LicenseKeyTab
            initialLicense={initialLicense}
            initialHasKey={initialHasKey}
            initialRawKey={initialRawKey}
            plans={plans}
          />
        </TabsContent>

        <TabsContent value="privacy" className="pt-6">
          <DataPrivacyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: License
// ---------------------------------------------------------------------------

function LicenseKeyTab({
  initialLicense,
  initialHasKey,
  initialRawKey,
  plans,
}: {
  initialLicense: LicenseInfo;
  initialHasKey: boolean;
  initialRawKey: string;
  plans: Plan[];
}) {
  const { toast } = useToast();
  const [license, setLicense] = useState(initialLicense);
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [rawKey, setRawKey] = useState(initialRawKey);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleActivate() {
    if (!keyInput.trim()) return;
    const formData = new FormData();
    formData.set("key", keyInput.trim());

    startTransition(async () => {
      const result = await activateLicense(formData);
      if (result.success && result.license) {
        setLicense(result.license);
        setHasKey(true);
        setRawKey(keyInput.trim());
        setKeyInput("");
        toast({ title: "License activated" });
      } else {
        toast({
          title: "Activation failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshLicense();
      if (result.success && result.license) {
        setLicense(result.license);
        toast({ title: "License refreshed" });
      } else {
        toast({
          title: "Refresh failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  const enrolledPlan = license.plan
    ? plans.find((p) => p.slug === license.plan!.slug) ?? null
    : null;

  const legal = license.legal;
  const hasPending = (legal?.pendingAcceptance?.length ?? 0) > 0;
  const acceptedDocs = Object.entries(legal?.acceptedAt ?? {});

  return (
    <>
      {legal && (
        <div className="flex items-center gap-2 text-sm">
          {hasPending ? (
            <>
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-muted-foreground">
                Service terms acceptance required for some features.
              </span>
            </>
          ) : acceptedDocs.length > 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-muted-foreground">
                Service terms accepted on{" "}
                <span className="text-foreground font-medium">
                  {new Date(acceptedDocs[0][1]).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Service terms not yet accepted.
              </span>
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Open Source License */}
        <div className="flex flex-col rounded-lg border p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Your Store, Your Code</h3>
            <p className="text-sm text-muted-foreground">
              Released under the MIT License — you own the source code.
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              Modify anything — the code is yours to customize
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              No vendor lock-in — host anywhere, switch anytime
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              No per-transaction fees on your sales
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              Your data stays on your infrastructure
            </li>
          </ul>
          <div className="mt-auto pt-5">
            <a
              href="https://github.com/yuens1002/artisan-roast/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              View MIT License on GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Platform License */}
        <div className="flex flex-col rounded-lg border p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Platform License {hasKey && <Badge variant="secondary">Active</Badge>}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isPending}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Connects your store to the Artisan Roast platform for
              premium support services and features.
            </p>
          </div>
          {hasKey ? (
            <>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                  {showKey ? rawKey : maskKey(rawKey)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              {enrolledPlan && (
                <p className="text-sm">
                  Current plan: <span className="font-bold">{enrolledPlan.name}</span>
                </p>
              )}

              {license.trialEndsAt && (
                <p className="text-sm text-muted-foreground">
                  {license.tier === "TRIAL" ? "Trial ends" : "Renews"}:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(license.trialEndsAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}

              <div className="mt-auto pt-5 flex items-center gap-3">
                {license.availableActions
                  .filter((a) => a.slug === "manage-billing")
                  .map((action) => (
                    <Button
                      key={action.slug}
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {action.label}
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="ar_lic_..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  disabled={isPending}
                  className="max-w-md font-mono text-sm"
                  aria-label="License key"
                />
                <Button
                  onClick={handleActivate}
                  disabled={isPending || !keyInput.trim()}
                  size="sm"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  Activate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your license key to connect to the platform.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Data Privacy
// ---------------------------------------------------------------------------

function DataPrivacyTab() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchTelemetrySettings = async () => {
      try {
        const response = await fetch("/api/admin/settings/telemetry");
        if (!response.ok) throw new Error("Failed to load telemetry settings");

        const data = (await response.json()) as { enabled?: boolean };
        setEnabled(data.enabled !== false);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load telemetry settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTelemetrySettings();
  }, [toast]);

  function handleTelemetryToggle(checked: boolean) {
    const previousValue = enabled;
    setEnabled(checked);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/settings/telemetry", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: checked }),
        });

        if (!response.ok) throw new Error("Failed to save telemetry settings");

        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
      } catch {
        setEnabled(previousValue);
        toast({
          title: "Error",
          description: "Failed to save telemetry settings",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex h-full flex-col space-y-4 rounded-lg border p-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Share Anonymous Usage Data</h3>
          <p className="text-sm text-muted-foreground">
            Help us improve Artisan Roast by sharing anonymous usage statistics
          </p>
        </div>

        <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">What we collect:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Anonymous instance ID (random, not linked to you)</li>
            <li>App version and edition</li>
            <li>Aggregate counts (products, users, orders)</li>
            <li>Server environment (Node.js version, platform)</li>
          </ul>
          <p className="mt-3">
            We <strong>never</strong> collect personal information, customer
            data, or anything that could identify you or your customers.
          </p>
        </div>

        <div className="mt-auto pt-5 flex items-center justify-between">
          <Link
            href="/admin/terms/privacy-policy"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            View Data Privacy
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Telemetry</span>
            <Switch
              checked={enabled}
              onCheckedChange={handleTelemetryToggle}
              disabled={isLoading || isPending}
              aria-label="Toggle telemetry"
            />
          </div>
        </div>
      </div>

      <DownloadDataCard />
    </div>
  );
}
