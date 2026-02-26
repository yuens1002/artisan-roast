import { Heading, Img, Link, Section, Text } from "@react-email/components";
import { Fragment } from "react";
import type { EmailBranding } from "./_components";
import { APP_URL, Divider, EmailLayout, ItemDivider } from "./_components";
import * as s from "./_styles";

interface ReviewRequestProduct {
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface ReviewRequestEmailProps extends EmailBranding {
  customerName: string;
  products: ReviewRequestProduct[];
}

export default function ReviewRequestEmail({
  customerName,
  products,
  storeName,
  ...branding
}: ReviewRequestEmailProps) {
  return (
    <EmailLayout
      preview={`How was your coffee? Share a Brew Report! - ${storeName ?? ""}`}
      storeName={storeName}
      {...branding}
    >
      <Heading style={s.h1}>How was your coffee?</Heading>

      <Text style={s.text}>Hi {customerName},</Text>

      <Text style={s.text}>
        We hope you&apos;re enjoying your recent order! Help fellow coffee
        lovers find their perfect cup by sharing a Brew Report.
      </Text>

      {products.map((product, index) => (
        <Fragment key={product.slug}>
          {index > 0 && <ItemDivider />}
          <Section style={productRow}>
            {product.imageUrl && (
              <Img
                src={product.imageUrl}
                alt={product.name}
                width={64}
                height={64}
                style={productImage}
              />
            )}
            <Text style={productName}>{product.name}</Text>
            <Link
              href={`${APP_URL}/products/${product.slug}#reviews`}
              style={ctaButton}
            >
              Write a Brew Report &rarr;
            </Link>
          </Section>
        </Fragment>
      ))}

      <Divider />
    </EmailLayout>
  );
}

const productRow = {
  padding: "16px 40px",
};

const productImage = {
  borderRadius: "8px",
  marginBottom: "8px",
};

const productName = {
  color: "#333",
  fontSize: "16px",
  fontWeight: "600" as const,
  lineHeight: "24px",
  margin: "0 0 8px 0",
};

const ctaButton = {
  backgroundColor: "#8B4513",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  padding: "10px 20px",
  display: "inline-block" as const,
};
