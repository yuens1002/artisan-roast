"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { demoSignIn } from "@/app/auth/actions";

// Display config only — credentials are kept server-side in the action
const DEMO_ACCOUNTS = {
  admin: {
    label: "Sign in as Admin",
    description: "Full dashboard access",
    icon: ShieldCheck,
  },
  customer: {
    label: "Sign in as Demo Customer",
    description: "View orders, recommendations",
    icon: User,
  },
} as const;

type AccountType = keyof typeof DEMO_ACCOUNTS;

/**
 * Demo sign-in buttons that auto-authenticate without exposing passwords.
 * Only renders when NEXT_PUBLIC_DEMO_MODE=true
 */
export function DemoSignInButtons() {
  const [loading, setLoading] = useState<AccountType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show in demo mode
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return null;
  }

  const handleDemoSignIn = async (accountType: AccountType) => {
    setLoading(accountType);
    setError(null);

    try {
      const result = await demoSignIn(accountType);
      if (result?.error) {
        setError(result.error);
        setLoading(null);
      }
    } catch (err) {
      // Next.js redirect throws NEXT_REDIRECT — rethrow it
      if (err instanceof Error && err.message?.includes("NEXT_REDIRECT")) {
        throw err;
      }
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center text-xs text-muted-foreground">
        Quick demo access
      </div>

      {error && (
        <div className="text-center text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-2">
        {(Object.keys(DEMO_ACCOUNTS) as AccountType[]).map((accountType) => {
          const account = DEMO_ACCOUNTS[accountType];
          const Icon = account.icon;
          const isLoading = loading === accountType;

          return (
            <Button
              key={accountType}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleDemoSignIn(accountType)}
              disabled={loading !== null}
            >
              {isLoading ? (
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <Icon className="mr-3 h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-medium">{account.label}</div>
                <div className="text-xs text-muted-foreground">
                  {account.description}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
