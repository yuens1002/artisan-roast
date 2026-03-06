"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportCsvButtonProps {
  onClick: () => void;
}

export function ExportCsvButton({ onClick }: ExportCsvButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} aria-label="Export CSV">
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Export CSV</span>
    </Button>
  );
}
