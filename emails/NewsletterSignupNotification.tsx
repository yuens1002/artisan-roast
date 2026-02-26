import { Heading, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface NewsletterSignupNotificationProps extends EmailBranding {
  subscriberEmail: string;
  subscribedAt: string;
  totalSubscribers: number;
}

export default function NewsletterSignupNotification({
  subscriberEmail,
  subscribedAt,
  totalSubscribers,
  ...branding
}: NewsletterSignupNotificationProps) {
  return (
    <EmailLayout preview={`New newsletter subscriber: ${subscriberEmail}`} {...branding}>
      <Heading style={s.h1}>New Newsletter Subscriber</Heading>

      <Text style={s.text}>
        A new subscriber has joined your newsletter mailing list.
      </Text>

      <ContainedSection innerStyle={s.infoBox}>
        <Text style={s.infoBoxLabel}>Email Address</Text>
        <Text style={s.infoBoxValue}>{subscriberEmail}</Text>
        <Text style={s.infoBoxLabel}>Subscribed At</Text>
        <Text style={s.infoBoxValue}>{subscribedAt}</Text>
        <Text style={s.infoBoxLabel}>Total Subscribers</Text>
        <Text style={s.infoBoxValue}>{totalSubscribers}</Text>
      </ContainedSection>

      <Divider />
    </EmailLayout>
  );
}
