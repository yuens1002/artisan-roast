import { logger } from "@/lib/logger";
import { getResend } from "@/lib/services/resend";
import { getEmailBranding } from "@/lib/config/app-settings";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import type { SendOrderConfirmationParams, EmailSendResult } from "./types";
import {
  buildCombinedEmailItems,
  buildShippingAddressForEmail,
  calculateCombinedTotals,
  formatOrderNumbers,
  formatOrderDate,
} from "./email-data-builder";

/**
 * Sends order confirmation email to customer
 * Combines multiple orders into a single email
 */
export async function sendOrderConfirmation(
  params: SendOrderConfirmationParams
): Promise<EmailSendResult> {
  const { orders, storeName } = params;

  if (orders.length === 0) {
    return { success: false, error: "No orders provided" };
  }

  const firstOrder = orders[0];
  if (!firstOrder.customerEmail) {
    return { success: false, error: "No customer email" };
  }

  try {
    const emailItems = buildCombinedEmailItems(orders);
    const shippingAddressData = buildShippingAddressForEmail(firstOrder);
    const { subtotalInCents, totalInCents, shippingInCents } =
      calculateCombinedTotals(orders);
    const orderNumbers = formatOrderNumbers(orders);
    const { logoUrl } = await getEmailBranding();

    const resend = getResend();
    if (!resend) return { success: true };

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "orders@artisan-roast.com",
      to: firstOrder.customerEmail,
      subject: `Order Confirmation - ${orderNumbers}`,
      react: OrderConfirmationEmail({
        orderId: firstOrder.id,
        orderNumber: orders.map((o) => o.id.slice(-8)).join(", "),
        customerName: firstOrder.recipientName || "Customer",
        customerEmail: firstOrder.customerEmail,
        items: emailItems,
        subtotalInCents,
        shippingInCents,
        totalInCents,
        deliveryMethod: firstOrder.deliveryMethod as "DELIVERY" | "PICKUP",
        shippingAddress: shippingAddressData,
        orderDate: formatOrderDate(firstOrder.createdAt),
        storeName,
        logoUrl,
      }),
    });

    logger.debug(
      `📧 Customer confirmation email sent for ${orders.length} order(s)`
    );
    return { success: true };
  } catch (error) {
    logger.error("Failed to send customer email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
