import Link from "next/link";
import type { RecordItem } from "./MobileRecordCard";

interface RecordItemsListProps {
  items: RecordItem[];
  strikethrough?: boolean;
}

export function RecordItemsList({ items, strikethrough }: RecordItemsListProps) {
  return (
    <div className={`space-y-2 ${strikethrough ? "line-through text-muted-foreground" : ""}`}>
      {items.map((item, idx) => (
        <div key={item.id}>
          <div className="text-sm">
            {item.href && !strikethrough ? (
              <Link
                href={item.href}
                className="text-foreground hover:text-primary"
              >
                {item.name}
              </Link>
            ) : (
              item.name
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {[item.variant, item.purchaseType].filter(Boolean).join(" · ")}
            {(item.variant || item.purchaseType) && " · "}
            {item.refundedQuantity != null && item.refundedQuantity > 0 ? (
              <>
                Qty: <span className="line-through">{item.quantity}</span>{" "}
                <span className="text-red-600">-{item.refundedQuantity}</span>
              </>
            ) : (
              <>Qty: {item.quantity}</>
            )}
          </div>
          {idx < items.length - 1 && (
            <div className="border-t border-border mt-2" />
          )}
        </div>
      ))}
    </div>
  );
}
