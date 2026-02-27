"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3 } from "lucide-react";

interface TogglableColumn {
  id: string;
  label: string;
}

interface ColumnVisibilityToggleProps {
  columns: TogglableColumn[];
  columnVisibility: Record<string, boolean>;
  onVisibilityChange: (columnId: string, visible: boolean) => void;
}

export function ColumnVisibilityToggle({
  columns,
  columnVisibility,
  onVisibilityChange,
}: ColumnVisibilityToggleProps) {
  return (
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm">
            <Columns3 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
          {columns.map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={columnVisibility[col.id] !== false}
              onCheckedChange={(checked) =>
                onVisibilityChange(col.id, !!checked)
              }
            >
              {col.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
