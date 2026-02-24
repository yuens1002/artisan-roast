"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { FormField } from "@/components/ui/forms/FormField";

// Custom Google icon since lucide-react doesn't have it
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface Account {
  provider: string;
  providerAccountId: string;
}

interface ConnectedAccountsTabProps {
  accounts: Account[];
}

/**
 * Connected Accounts Tab Component
 *
 * Features:
 * - Show currently connected OAuth providers
 * - Allow connecting additional providers
 * - Show provider-specific information
 *
 * Educational Notes:
 * - Users can link multiple OAuth providers to one account
 * - Auth.js handles account linking automatically if emails match
 * - Cannot disconnect the last authentication method
 */
export default function ConnectedAccountsTab({
  accounts,
}: ConnectedAccountsTabProps) {
  const hasGoogle = accounts.some((acc) => acc.provider === "google");
  const hasGithub = accounts.some((acc) => acc.provider === "github");

  const handleConnect = async (provider: string) => {
    await signIn(provider, { callbackUrl: "/account?tab=accounts" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Manage your OAuth provider connections. You can sign in with any
          connected account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField className="space-y-4">
          {/* Google Account */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <GoogleIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">Google</p>
                <p className="text-sm text-muted-foreground">
                  {hasGoogle ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {hasGoogle ? (
              <Button variant="outline" disabled>
                Connected
              </Button>
            ) : (
              <Button variant="outline" onClick={() => handleConnect("google")}>
                Connect
              </Button>
            )}
          </div>

          {/* GitHub Account */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">GitHub</p>
                <p className="text-sm text-muted-foreground">
                  {hasGithub ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {hasGithub ? (
              <Button variant="outline" disabled>
                Connected
              </Button>
            ) : (
              <Button variant="outline" onClick={() => handleConnect("github")}>
                Connect
              </Button>
            )}
          </div>

          {/* Email/Password indicator */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Email & Password</p>
                <p className="text-sm text-muted-foreground">Manage in Security tab</p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <a href="#security">Go to Security</a>
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> When you connect a new account, Auth.js will
              automatically link it to your existing account if the email
              addresses match. You can sign in with any connected method.
            </p>
          </div>
        </FormField>
      </CardContent>
    </Card>
  );
}
