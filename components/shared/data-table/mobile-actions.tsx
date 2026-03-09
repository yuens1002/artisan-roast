import type { RowActionItem } from "./RowActionMenu";
import type { RecordAction } from "@/components/shared/MobileRecordCard";

/**
 * Converts RowActionItem[] (desktop dropdown menu) to RecordAction[]
 * (mobile card action buttons). Strips separators, renders icons as JSX.
 */
export function transformToMobileActions(
  items: RowActionItem[]
): RecordAction[] {
  return items
    .filter(
      (item): item is Exclude<RowActionItem, { type: "separator" } | { type: "sub-menu" }> =>
        item.type !== "separator" && item.type !== "sub-menu"
    )
    .map((item) => {
      const icon = item.icon ? (
        <item.icon className="h-4 w-4 mr-2" />
      ) : undefined;

      if (item.type === "sub-menu-click") {
        return {
          label: item.label,
          icon,
          subItems: item.items.map((sub) => ({
            label: sub.label,
            onClick: sub.onClick,
          })),
        };
      }

      return {
        label: item.label,
        onClick: item.onClick,
        variant: item.variant as "default" | "destructive" | undefined,
        icon,
      };
    });
}
