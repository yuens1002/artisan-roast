import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";
import { AddToCartButton } from "./AddToCartButton";
import type { ButtonState } from "@/hooks/useAddToCartWithFeedback";

interface ProductQuantityCartProps {
  quantity: number;
  stockQuantity: number;
  hasSelectedPurchaseOption: boolean;
  priceInCents?: number | null;
  originalPriceInCents?: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  onActionClick?: () => void;
  buttonState?: ButtonState;
  isProcessing?: boolean;
  spacing?: "2" | "3" | "4";
}

export function ProductQuantityCart({
  quantity,
  stockQuantity,
  hasSelectedPurchaseOption,
  priceInCents,
  originalPriceInCents,
  onQuantityChange,
  onAddToCart,
  onActionClick,
  buttonState = "idle",
  isProcessing = false,
  spacing = "3",
}: ProductQuantityCartProps) {
  const isOutOfStock = stockQuantity <= 0;
  const isDisabled = isOutOfStock || !hasSelectedPurchaseOption;

  return (
    <div className={cn(
      "w-full flex flex-col",
      `gap-${spacing}`
    )}>
      {/* +/- stepper */}
      <ButtonGroup className="w-full">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-14 w-14 shadow-none"
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
          disabled={isDisabled}
        >
          <MinusIcon />
        </Button>
        <input
          type="text"
          readOnly
          tabIndex={-1}
          value={quantity}
          className="h-14 flex-1 min-w-0 text-center text-base font-semibold border border-border bg-transparent outline-none"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-14 w-14 shadow-none"
          onClick={() => onQuantityChange(quantity + 1)}
          disabled={isDisabled}
        >
          <PlusIcon />
        </Button>
      </ButtonGroup>

      <div>
        {isOutOfStock ? (
          <Button
            size="lg"
            className="h-14 w-full text-lg"
            disabled
          >
            Out of Stock
          </Button>
        ) : (
          <AddToCartButton
            buttonState={buttonState}
            onAddToCart={onAddToCart}
            onActionClick={onActionClick || (() => {})}
            disabled={isDisabled}
            isProcessing={isProcessing}
            size="lg"
            className="h-14 w-full text-lg"
            priceInCents={priceInCents}
            originalPriceInCents={originalPriceInCents}
          />
        )}
      </div>
    </div>
  );
}
