import { RoastLevel } from "@prisma/client";
import { cn } from "@/lib/utils";

const roastLabels: Record<RoastLevel, string> = {
  LIGHT: "Light Roast",
  MEDIUM: "Medium Roast",
  DARK: "Dark Roast",
};

const roastSegments: RoastLevel[] = ["LIGHT", "MEDIUM", "DARK"];

const roastActiveColor: Record<RoastLevel, string> = {
  LIGHT: "bg-yellow-600",
  MEDIUM: "bg-yellow-800",
  DARK: "bg-yellow-950",
};

interface RoastLevelBarProps {
  roastLevel: RoastLevel;
  showLabel?: boolean;
  className?: string;
}

export function RoastLevelBar({
  roastLevel,
  showLabel = true,
  className,
}: RoastLevelBarProps) {
  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <div className="flex gap-0.5 w-24 shrink min-w-12">
        {roastSegments.map((level) => (
          <div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              level === roastLevel ? roastActiveColor[level] : "bg-muted"
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{roastLabels[roastLevel]}</span>
      )}
    </div>
  );
}
