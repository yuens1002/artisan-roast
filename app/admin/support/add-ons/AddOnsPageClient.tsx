"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { startAlaCarteCheckout } from "./actions";
import type { LicenseInfo } from "@/lib/license-types";
import type { AlaCartePool } from "artisan-roast-sdk/alacarte";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddOnsPageClientProps {
  license: LicenseInfo;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddOnsPageClient({ license }: AddOnsPageClientProps) {
  const packages = license.alaCarte;
  const { toast } = useToast();
  const searchParams = useSearchParams();
  // Track pending state per package to avoid all buttons entering loading state together
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("demo") === "success") {
      toast({ title: "Purchase complete — Demo mode, no charge made." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePurchase(alaCarteSlug: string) {
    setPendingSlug(alaCarteSlug);
    const formData = new FormData();
    formData.set("alaCarteSlug", alaCarteSlug);

    try {
      const result = await startAlaCarteCheckout(formData);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast({
          title: "Checkout failed",
          description: result.error,
          variant: "destructive",
        });
        setPendingSlug(null);
      }
    } catch {
      toast({ title: "Checkout failed", variant: "destructive" });
      setPendingSlug(null);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <PageTitle
        title="Add-Ons"
        subtitle="Purchase one-time support packages — never expire"
      />

      {packages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="flex flex-col rounded-lg border p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{pkg.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pkg.description}
                  </p>
                </div>
                {pkg.pools.length > 0 && (
                  <ul className="space-y-1">
                    {pkg.pools.map((pool: AlaCartePool) => (
                      <li key={pool.slug} className="text-sm text-muted-foreground">
                        {pool.quantity} {pool.label}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between mt-auto">
                  <Button
                    size="sm"
                    disabled={pendingSlug === pkg.id}
                    onClick={() => handlePurchase(pkg.id)}
                  >
                    {pendingSlug === pkg.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Purchase
                  </Button>
                  <span className="text-lg font-bold">{pkg.price}</span>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No add-on packages available at this time.
            </p>
        </div>
      )}
    </div>
  );
}
