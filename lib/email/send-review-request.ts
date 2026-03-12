import { getResend } from "@/lib/services/resend";
import { render } from "@react-email/render";
import { getEmailBranding } from "@/lib/config/app-settings";
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
  const { logoUrl } = await getEmailBranding();

  const html = await render(
    ReviewRequestEmail({
      customerName: data.customerName,
      products: data.products,
      storeName: data.storeName,
      logoUrl,
    })
  );

  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
    to: data.customerEmail,
    subject: "How was your coffee? Share a Brew Report!",
    html,
  });
}
