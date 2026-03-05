import { cn } from "@/lib/utils";

interface StatGridProps {
  columns?: number;
  children: React.ReactNode;
  className?: string;
}

export function StatGrid({ columns = 3, children, className }: StatGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4",
        columns === 3 && "md:grid-cols-3",
        columns === 4 && "md:grid-cols-4",
        columns === 5 && "md:grid-cols-5",
        columns === 6 && "md:grid-cols-3 lg:grid-cols-6",
        className
      )}
    >
      {children}
    </div>
  );
}
