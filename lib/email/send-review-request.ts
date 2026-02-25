import { resend } from "@/lib/services/resend";
import { render } from "@react-email/render";
import ReviewRequestEmail from "@/emails/ReviewRequestEmail";

interface ReviewRequestEmailData {
  customerEmail: string;
  customerName: string;
  products: Array<{ name: string; slug: string; imageUrl: string | null }>;
  storeName?: string;
}

export async function sendReviewRequest(
  data: ReviewRequestEmailData
): Promise<void> {
  const html = await render(
    ReviewRequestEmail({
      customerName: data.customerName,
      products: data.products,
      storeName: data.storeName,
    })
  );

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Artisan Roast <noreply@artisanroast.app>",
    to: data.customerEmail,
    subject: "How was your coffee? Share a Brew Report!",
    html,
  });
}
