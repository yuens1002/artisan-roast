"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Eye, EyeOff, RefreshCw, Clock } from "lucide-react";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { SettingsSection } from "@/app/admin/_components/forms/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SCHEDULED_TASKS = [
  {
    name: "Delivery Status Check",
    path: "/api/cron/check-deliveries",
    schedule: "Daily at midnight UTC",
    description: "Polls carrier APIs for delivery status updates on shipped orders",
  },
  {
    name: "Review Request Emails",
    path: "/api/cron/review-emails",
    schedule: "Daily at midnight UTC",
    description: "Sends review request emails to customers after delivery",
  },
];

export default function ScheduledJobsPage() {
  const { toast } = useToast();
  const [cronSecret, setCronSecret] = useState<string | null>(null);
  const [hasSecret, setHasSecret] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchSecret = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/cron-secret");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCronSecret(data.cronSecret);
      setHasSecret(data.hasSecret);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load cron secret",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSecret();
  }, [fetchSecret]);

  const generateSecret = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/settings/cron-secret", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setCronSecret(data.cronSecret);
      setHasSecret(true);
      setIsRevealed(true);
      toast({
        title: "Secret generated",
        description: "Copy it and set as CRON_SECRET in your hosting provider",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate cron secret",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (hasSecret) {
      setShowConfirm(true);
    } else {
      generateSecret();
    }
  };

  const handleCopy = async () => {
    if (!cronSecret) return;
    try {
      await navigator.clipboard.writeText(cronSecret);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select and copy manually",
        variant: "destructive",
      });
    }
  };

  const maskedValue = cronSecret
    ? "\u2022".repeat(Math.min(cronSecret.length, 40))
    : "";

  return (
    <div className="space-y-8">
      <PageTitle
        title="Scheduled Jobs"
        subtitle="Manage cron job authentication and view scheduled tasks"
      />

      <SettingsSection
        title="Cron Authentication"
        description="Generate a secret token to authenticate scheduled job requests from your hosting provider"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-10 flex-1 animate-pulse rounded-md bg-muted" />
            ) : (
              <Input
                readOnly
                value={
                  !hasSecret
                    ? "No secret configured"
                    : isRevealed
                      ? (cronSecret ?? "")
                      : maskedValue
                }
                className="flex-1 font-mono text-sm"
              />
            )}
            {hasSecret && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsRevealed(!isRevealed)}
                  title={isRevealed ? "Hide" : "Reveal"}
                >
                  {isRevealed ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              {hasSecret ? "Regenerate" : "Generate"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy this value and set it as{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              CRON_SECRET
            </code>{" "}
            in your hosting provider&apos;s environment variables (e.g., Vercel
            &rarr; Settings &rarr; Environment Variables). Your host sends this
            token with each scheduled request for authentication.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Scheduled Tasks"
        description="These tasks run automatically on a schedule when configured with your hosting provider"
      >
        <div className="divide-y divide-border rounded-md border">
          {SCHEDULED_TASKS.map((task) => (
            <div key={task.path} className="flex items-start gap-4 p-4">
              <div className="mt-0.5 rounded-md bg-muted p-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{task.name}</div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {task.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                    {task.path}
                  </code>
                  <span>{task.schedule}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate cron secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the existing secret. You&apos;ll need to update
              the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                CRON_SECRET
              </code>{" "}
              environment variable in your hosting provider or scheduled jobs
              will fail to authenticate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false);
                generateSecret();
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
