"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

interface DataTableShellProps {
  children: React.ReactNode;
  /** When true, table fits its container instead of expanding to content width. */
  fitContainer?: boolean;
  className?: string;
}

export function DataTableShell({ children, fitContainer, className }: DataTableShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, [role=button], .cursor-col-resize")) return;

    setIsDragging(true);
    dragState.current = {
      startX: e.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = x - dragState.current.startX;
      container.scrollLeft = dragState.current.scrollLeft - walk;
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-l-lg overflow-x-auto",
        isDragging && "select-none",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <table className={cn(
        "w-full caption-bottom text-sm",
        fitContainer ? "table-auto overflow-clip" : "min-w-max table-fixed",
        isDragging && "[&_td]:cursor-grabbing [&_th]:cursor-grabbing"
      )}>
        {children}
      </table>
    </div>
  );
}
