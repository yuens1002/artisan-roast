import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { formatBillingInterval, formatPrice } from "@/lib/utils";
import type { ProductVariant } from "@/lib/types";

interface ProductDeliveryScheduleProps {
  variant: ProductVariant;
  selectedSubscriptionOptionId: string | null;
  selectedPurchaseOptionId: string | null;
  onSubscriptionCadenceChange: (optionId: string) => void;
}

export function ProductDeliverySchedule({
  variant,
  selectedSubscriptionOptionId,
  selectedPurchaseOptionId,
  onSubscriptionCadenceChange,
}: ProductDeliveryScheduleProps) {
  return (
    <InputGroup className="h-14 w-full rounded-md border border-border overflow-hidden">
      <InputGroupAddon
        align="inline-start"
        className="h-full px-4 text-sm font-semibold text-foreground"
      >
        Schedule
      </InputGroupAddon>
      <Select
        value={
          selectedSubscriptionOptionId || selectedPurchaseOptionId || undefined
        }
        onValueChange={onSubscriptionCadenceChange}
      >
        <SelectTrigger className="h-full flex-1 border-0 bg-transparent dark:bg-transparent shadow-none focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder="Choose delivery schedule" />
        </SelectTrigger>
        <SelectContent>
          {variant.purchaseOptions
            .filter((o) => o.type === "SUBSCRIPTION")
            .map((option) => {
              const interval = option.billingInterval?.toLowerCase() || "week";
              const count = option.billingIntervalCount || 1;
              const label = formatBillingInterval(interval, count);
              const capitalizedLabel =
                label.charAt(0).toUpperCase() + label.slice(1);

              return (
                <SelectItem key={option.id} value={option.id}>
                  {capitalizedLabel} - ${formatPrice(option.priceInCents)}
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>
    </InputGroup>
  );
}
