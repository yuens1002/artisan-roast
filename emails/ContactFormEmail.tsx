import { Heading, Section, Text } from "@react-email/components";
import { Fragment } from "react";
import type { EmailBranding } from "./_components";
import { ContainedSection, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface ContactFormEmailProps extends EmailBranding {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const ContactFormEmail = ({
  name,
  email,
  subject,
  message,
  ...branding
}: ContactFormEmailProps) => {
  return (
    <EmailLayout preview={`New Contact Form Submission: ${subject}`} {...branding}>
      <Heading style={s.h1}>New Contact Form Submission</Heading>

      <Section style={s.detailSection}>
        <Text style={s.detailLabel}>From</Text>
        <Text style={s.detailValue}>
          {name} ({email})
        </Text>
        <Text style={s.detailLabel}>Subject</Text>
        <Text style={s.detailValue}>{subject}</Text>
      </Section>

      <Divider />

      <Text style={{ ...s.detailLabel, padding: "0 40px" }}>Message</Text>
      <ContainedSection innerStyle={messageBoxInner} margin="8px 0 20px">
        <Text style={messageText}>
          {message.split("\n").map((line, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </Text>
      </ContainedSection>
    </EmailLayout>
  );
};

export default ContactFormEmail;

const messageBoxInner = {
  backgroundColor: "#f4f4f4",
  borderRadius: "8px",
  padding: "24px",
};

const messageText = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0",
};
