import { Heading, Link, Section, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface NewReviewNotificationProps extends EmailBranding {
  productName: string;
  reviewerName: string;
  rating: number;
  isPending: boolean;
}

export default function NewReviewNotification({
  productName,
  reviewerName,
  rating,
  isPending,
  storeName,
  ...branding
}: NewReviewNotificationProps) {
  const stars = "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);

  return (
    <EmailLayout
      preview={`New ${rating}-star review for ${productName} - ${storeName}`}
      storeName={storeName}
      {...branding}
    >
      <Heading style={s.h1}>New Review Submitted</Heading>

      <Text style={s.text}>
        A new review has been submitted and{" "}
        {isPending ? "is awaiting moderation" : "has been published"}.
      </Text>

      <ContainedSection innerStyle={s.highlightSection}>
        <Text style={s.highlightLabel}>Product</Text>
        <Text style={s.highlightValue}>{productName}</Text>
        <Text style={s.highlightLabel}>Reviewer</Text>
        <Text style={s.highlightValue}>{reviewerName}</Text>
        <Text style={s.highlightLabel}>Rating</Text>
        <Text style={s.highlightValue}>
          {stars} ({rating}/5)
        </Text>
      </ContainedSection>

      {isPending && (
        <ContainedSection innerStyle={s.alertSection} margin="0 0 24px">
          <Text style={s.alertText}>
            This review was auto-flagged and is awaiting moderation.
          </Text>
        </ContainedSection>
      )}

      <Divider />

      <Section style={s.buttonSection}>
        <Link href={`${APP_URL}/admin/reviews`} style={s.button}>
          View in Admin
        </Link>
      </Section>
    </EmailLayout>
  );
}
