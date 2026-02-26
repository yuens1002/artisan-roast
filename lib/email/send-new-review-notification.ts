import { resend } from "@/lib/services/resend";
import { render } from "@react-email/render";
import { getEmailBranding } from "@/lib/config/app-settings";
import NewReviewNotification from "@/emails/NewReviewNotification";

interface NewReviewNotificationData {
  productName: string;
  reviewerName: string;
  rating: number;
  isPending: boolean;
}

export async function sendNewReviewNotification(
  data: NewReviewNotificationData
): Promise<void> {
  const merchantEmail =
    process.env.RESEND_MERCHANT_EMAIL ||
    process.env.MERCHANT_EMAIL;

  if (!merchantEmail) return;

  const { logoUrl } = await getEmailBranding();

  const html = await render(
    NewReviewNotification({
      productName: data.productName,
      reviewerName: data.reviewerName,
      rating: data.rating,
      isPending: data.isPending,
      logoUrl,
    })
  );

  await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
    to: merchantEmail,
    subject: `New review: ${data.productName} (${data.rating}/5)`,
    html,
  });
}
