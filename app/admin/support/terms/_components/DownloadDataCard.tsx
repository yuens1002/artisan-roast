"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Download Your Data — visible to all builds (not gated on hosted mode)
//
// Streams a ZIP from GET /api/admin/export. The browser handles the file
// download via the Content-Disposition header on the response — no client-
// side blob assembly needed.
// ---------------------------------------------------------------------------

export function DownloadDataCard() {
  return (
    <div className="flex h-full flex-col space-y-4 rounded-lg border p-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Download Your Data</h3>
        <p className="text-sm text-muted-foreground">
          Export a ZIP archive of your store data and media. Your data is
          yours — take it with you anytime.
        </p>
      </div>

      <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">What&apos;s included:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Products, orders, users, and store settings (JSON)</li>
          <li>Media assets uploaded to your store</li>
          <li>A manifest with export timestamp and counts</li>
        </ul>
      </div>

      <div className="mt-auto pt-5 flex items-center justify-end">
        <Button asChild>
          <a href="/api/admin/export" download>
            <Download className="mr-2 h-4 w-4" />
            Download ZIP
          </a>
        </Button>
      </div>
    </div>
  );
}
