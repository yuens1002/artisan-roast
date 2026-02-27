"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/error-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Package } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { signOut } from "next-auth/react";

interface DangerZoneTabProps {
  userId: string;
  userEmail: string | null;
}

/**
 * Danger Zone Tab Component
 *
 * Features:
 * - Account deletion with confirmation
 * - Requires typing email to confirm
 * - Warns about data loss
 * - Auto sign-out after deletion
 *
 * Educational Notes:
 * - Account deletion should be permanent and irreversible
 * - All associated data (orders, addresses) should be handled appropriately
 * - Consider data retention policies (GDPR, CCPA)
 * - Some data may need to be retained for legal/financial reasons
 */
export default function DangerZoneTab({
  userEmail,
}: DangerZoneTabProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmEmail !== userEmail) {
      setError("Email does not match. Please try again.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      // Sign out and redirect to home
      await signOut({ callbackUrl: "/?deleted=true" });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete account"));
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <CardTitle className="text-red-600 dark:text-red-400">
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that permanently affect your account.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Box */}
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
          <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
            Before you delete your account:
          </h3>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
            <li>All your personal data will be permanently deleted</li>
            <li>
              Your order history will be anonymized but retained for records
            </li>
            <li>Any active subscriptions will be cancelled</li>
            <li>Saved addresses and preferences will be lost</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>

        {/* Delete Account Section */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-foreground mb-2">Delete Account</h3>
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
          </div>

          {userEmail?.includes('demo') ? (
            <div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">
              <p>Account deletion is not available for demo accounts.</p>
              <p className="mt-1 text-xs">This is a demonstration account used to showcase the platform features.</p>
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Account Permanently?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    This will permanently delete your account and all associated
                    data. This action cannot be undone.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="confirmEmail">
                      Type{" "}
                      <span className="font-mono font-semibold">
                        {userEmail}
                      </span>{" "}
                      to confirm:
                    </Label>
                    <Input
                      id="confirmEmail"
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => {
                        setConfirmEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="your.email@example.com"
                      className="font-mono"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                      {error}
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setConfirmEmail("");
                    setError(null);
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmEmail !== userEmail || isDeleting}
                  className={buttonVariants({ variant: "destructive" })}
                >
                  {isDeleting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>

        {/* Alternative: Export Data */}
        <div className="pt-4 border-t">
          <h3 className="font-medium text-foreground mb-2">
            Download Your Data
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Before deleting, you might want to download a copy of your data.
          </p>
          <Button variant="outline" disabled>
            <Package className="w-4 h-4 mr-2" />
            Request Data Export (Coming Soon)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
