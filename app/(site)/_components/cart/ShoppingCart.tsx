"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart as ShoppingCartIcon,
  Trash2,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCartStore, CartItem } from "@/lib/store/cart-store";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { useToast } from "@/hooks/use-toast";
import { formatBillingInterval } from "@/lib/utils";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { CartAddOnsSuggestions } from "./CartAddOnsSuggestions";

/**
 * ShoppingCart component - manages cart UI and logic
 * Renders a cart button with badge + drawer showing cart contents
 */
export function ShoppingCart() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { trackActivity } = useActivityTracking();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Delivery preferences
  const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">(
    "DELIVERY"
  );
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  const items = useCartStore((state) => state.items);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const isOpen = useCartStore((state) => state.isCartOpen);
  const setIsOpen = useCartStore((state) => state.setCartOpen);

  // Hydration fix: only read cart count on client side after mount
  useEffect(() => {
    setMounted(true);
    setCartItemCount(getTotalItems());
  }, [getTotalItems]);

  // Subscribe to cart changes
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe((state) => {
      setCartItemCount(state.getTotalItems());
    });
    return unsubscribe;
  }, []);

  // Listen for custom event to open cart
  useEffect(() => {
    const handleOpenCart = () => setIsOpen(true);
    window.addEventListener("openCart", handleOpenCart);
    return () => window.removeEventListener("openCart", handleOpenCart);
  }, [setIsOpen]);

  // Reset checkout processing state when cart is closed
  useEffect(() => {
    if (!isOpen) {
      setIsCheckingOut(false);
    }
  }, [isOpen]);

  // Listen for cart errors (e.g., mixed billing intervals)
  useEffect(() => {
    const handleCartError = () => {
      toast({
        title: "Ooops!",
        description:
          "Shopping cart can't handle mixed delivery schedule intervals",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
    };
    window.addEventListener("cartError", handleCartError);
    return () => window.removeEventListener("cartError", handleCartError);
  }, [toast]);

  // Fetch last order delivery preference
  useEffect(() => {
    const fetchDeliveryPreferences = async () => {
      if (!session?.user?.id) {
        setLoadingPreferences(false);
        return;
      }

      try {
        const ordersResponse = await fetch("/api/user/orders?limit=1");
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          if (ordersData.orders && ordersData.orders.length > 0) {
            const lastOrder = ordersData.orders[0];
            setDeliveryMethod(lastOrder.deliveryMethod || "DELIVERY");
          }
        }
      } catch (error) {
        console.error("Failed to fetch delivery preferences:", error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    if (isOpen) {
      fetchDeliveryPreferences();
    }
  }, [isOpen, session]);

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const handleQuantityChange = (item: CartItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity > 0) {
      updateQuantity(
        item.productId,
        item.variantId,
        item.purchaseOptionId,
        newQuantity
      );
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.productId, item.variantId, item.purchaseOptionId);
    trackActivity({
      activityType: "REMOVE_FROM_CART",
      productId: item.productId,
    });
  };

  const handleCheckout = async () => {
    // Check if cart has subscriptions
    const hasSubscription = items.some(
      (item) => item.purchaseType === "SUBSCRIPTION"
    );

    // If session is still loading and cart has subscriptions, wait a bit
    if (hasSubscription && sessionStatus === "loading") {
      toast({
        title: "Please wait",
        description: "Loading your session...",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          userId: session?.user?.id,
          deliveryMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If subscription requires auth, redirect to sign-in and show notice
        if (data?.code === "SUBSCRIPTION_REQUIRES_AUTH") {
          localStorage.setItem(
            "artisan-roast-checkout-notice",
            "To purchase a subscription, please sign in or create an account. Your cart will be saved."
          );
          setIsCheckingOut(false);
          setIsOpen(false);
          // Include callbackUrl so user returns to checkout after auth
          router.push("/auth/signin?callbackUrl=/checkout/resume");
          return;
        }

        // Handle mixed billing intervals error
        if (data?.code === "MIXED_BILLING_INTERVALS") {
          toast({
            title: "Ooops!",
            description:
              "Shopping cart can't handle mixed delivery schedule intervals",
            variant: undefined,
            className: "!bg-foreground !text-background !border-foreground",
          });
          setIsCheckingOut(false);
          return;
        }

        // Handle duplicate subscription error
        if (data?.code === "SUBSCRIPTION_EXISTS") {
          const duplicates = data.duplicates || [];
          const count = duplicates.length;
          const subscriptionText =
            count === 1 ? "Subscription" : "Subscriptions";
          const existsText = count === 1 ? "exists" : "exist";

          const productList = duplicates
            .map((name: string) => `• ${name}`)
            .join("\n");

          toast({
            title: `${subscriptionText} ${existsText}`,
            description: `You already have a subscription for:\n${productList}`,
            variant: undefined,
            className:
              "!bg-foreground !text-background !border-foreground whitespace-pre-line",
          });
          setIsCheckingOut(false);
          return;
        }

        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        setIsOpen(false); // Close drawer before redirect to prevent it opening on return
        window.location.href = data.url;
      } else {
        toast({
          title: "Checkout error",
          description: "No checkout URL received. Please try again.",
          variant: undefined,
          className: "!bg-foreground !text-background !border-foreground",
        });
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: "Failed to start checkout. Please try again.",
        variant: undefined,
        className: "!bg-foreground !text-background !border-foreground",
      });
      setIsCheckingOut(false);
    }
  };

  // Don't render count until mounted (avoid hydration mismatch)
  const displayCount = mounted ? cartItemCount : 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Open cart (${displayCount} items)`}
        >
          <ShoppingCartIcon className="w-6 h-6" />
          {displayCount > 0 && (
            <span className="absolute top-0 -right-1.5 md:-top-2 md:-right-2 bg-primary text-primary-foreground text-[10px] md:text-xs w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center font-semibold">
              {displayCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] sm:max-w-[500px] flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-2xl font-bold tracking-tight text-left">
            Shopping Cart
          </SheetTitle>
          <SheetDescription className="sr-only">
            View and manage items in your shopping cart
          </SheetDescription>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCartIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Your cart is empty
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Add some delicious coffee to get started!
              </p>
              <Button asChild>
                <Link href="/" onClick={() => setIsOpen(false)}>Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}-${item.purchaseOptionId}`}
                  className="flex gap-4 py-3"
                >
                  {/* Product Image */}
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="shrink-0"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="font-medium text-foreground hover:text-primary line-clamp-2 mb-1"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.productName}
                    </Link>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>{item.variantName}</p>
                      <p className="capitalize">
                        {item.purchaseType === "SUBSCRIPTION"
                          ? `Subscription${
                              item.billingInterval
                                ? ` - ${formatBillingInterval(
                                    item.billingInterval,
                                    item.billingIntervalCount
                                  )}`
                                : ""
                            }`
                          : "One-time purchase"}
                      </p>
                    </div>

                    {/* Quantity Controls + Price */}
                    <div className="flex items-center justify-between mt-2">
                      {item.purchaseType === "ONE_TIME" ? (
                        <ButtonGroup>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="shadow-none"
                            onClick={() =>
                              item.quantity <= 1
                                ? handleRemoveItem(item)
                                : handleQuantityChange(item, -1)
                            }
                            aria-label={
                              item.quantity <= 1
                                ? "Remove item"
                                : "Decrease quantity"
                            }
                          >
                            {item.quantity <= 1 ? (
                              <Trash2 className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </Button>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={item.quantity}
                            className="h-8 w-10 min-w-0 text-center text-sm font-medium border border-border bg-transparent outline-none"
                          />
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="shadow-none"
                            onClick={() => handleQuantityChange(item, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </ButtonGroup>
                      ) : (
                        <ButtonGroup>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="shadow-none"
                            onClick={() => handleRemoveItem(item)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={`Qty: ${item.quantity}`}
                            className="h-8 w-14 min-w-0 text-center text-sm font-medium border border-border bg-transparent outline-none"
                          />
                        </ButtonGroup>
                      )}
                      <span className="text-right flex items-center shrink-0 ml-auto whitespace-nowrap">
                        {item.quantity > 1 && (
                          <span className="text-sm font-medium text-muted-foreground pr-4">
                            ×{item.quantity}
                          </span>
                        )}
                        <span>
                          {item.originalPriceInCents && (
                            <span className="text-sm text-muted-foreground line-through mr-1.5">
                              {formatPrice(item.originalPriceInCents)}
                            </span>
                          )}
                          <span className="font-semibold text-foreground">
                            {formatPrice(item.priceInCents)}
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add-ons Suggestions */}
          {items.length > 0 && <CartAddOnsSuggestions />}
        </div>

        {/* Cart Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 mt-auto">
            <div className="space-y-4">
              {/* Delivery Method Selection */}
              {session?.user && !loadingPreferences && (
                <div className="pb-4">
                  <RadioGroup
                    value={deliveryMethod}
                    onValueChange={(value) =>
                      setDeliveryMethod(value as "DELIVERY" | "PICKUP")
                    }
                  >
                    {/* Mobile: compact inline */}
                    <div className="sm:hidden space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Shipping</span>
                        <div className="flex items-center gap-4">
                          <label
                            htmlFor="delivery-mobile"
                            className="flex items-center gap-1.5 text-sm cursor-pointer"
                          >
                            <RadioGroupItem
                              value="DELIVERY"
                              id="delivery-mobile"
                            />
                            Delivery
                          </label>
                          <label
                            htmlFor="pickup-mobile"
                            className="flex items-center gap-1.5 text-sm cursor-pointer"
                          >
                            <RadioGroupItem
                              value="PICKUP"
                              id="pickup-mobile"
                            />
                            Pickup
                          </label>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {deliveryMethod === "DELIVERY"
                          ? "Enter shipping address at checkout"
                          : "123 Coffee Street, San Francisco, CA 94102"}
                      </p>
                    </div>

                    {/* Desktop: choice cards */}
                    <div className="hidden sm:contents">
                      <FieldLabel htmlFor="delivery">
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldTitle>Delivery</FieldTitle>
                            <FieldDescription>
                              Enter shipping address at checkout
                            </FieldDescription>
                          </FieldContent>
                          <RadioGroupItem value="DELIVERY" id="delivery" />
                        </Field>
                      </FieldLabel>
                      <FieldLabel htmlFor="pickup">
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldTitle>Store Pickup</FieldTitle>
                            <FieldDescription>
                              123 Coffee Street, San Francisco, CA 94102
                            </FieldDescription>
                          </FieldContent>
                          <RadioGroupItem value="PICKUP" id="pickup" />
                        </Field>
                      </FieldLabel>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>

              {/* Checkout Button */}
              {(() => {
                const hasSubscription = items.some(
                  (item) => item.purchaseType === "SUBSCRIPTION"
                );
                const isSessionLoading =
                  hasSubscription && sessionStatus === "loading";
                const isDisabled = isCheckingOut || isSessionLoading;

                return (
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isDisabled}
                  >
                    {isSessionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading session...
                      </>
                    ) : isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Proceed to Checkout"
                    )}
                  </Button>
                );
              })()}

            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
