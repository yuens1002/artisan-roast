import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ReviewRequestProduct {
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface ReviewRequestEmailProps {
  customerName: string;
  products: ReviewRequestProduct[];
  storeName?: string;
  appUrl?: string;
}

export default function ReviewRequestEmail({
  customerName,
  products,
  storeName = "Artisan Roast",
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://artisanroast.app",
}: ReviewRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        How was your coffee? Share a Brew Report! - {storeName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>How was your coffee?</Heading>

          <Text style={text}>Hi {customerName},</Text>

          <Text style={text}>
            We hope you&apos;re enjoying your recent order! Help fellow coffee
            lovers find their perfect cup by sharing a Brew Report.
          </Text>

          {products.map((product) => (
            <Section key={product.slug} style={productRow}>
              {product.imageUrl && (
                <Img
                  src={product.imageUrl}
                  alt={product.name}
                  width={64}
                  height={64}
                  style={productImage}
                />
              )}
              <div>
                <Text style={productName}>{product.name}</Text>
                <Button
                  href={`${appUrl}/products/${product.slug}#reviews`}
                  style={ctaButton}
                >
                  Write a Brew Report &rarr;
                </Button>
              </div>
            </Section>
          ))}

          <Hr style={hr} />

          <Text style={footerText}>
            {storeName} &middot; artisanroast.app
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const h1 = {
  color: "#333",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "40px 0 24px",
  padding: "0 40px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
};

const productRow = {
  padding: "16px 40px",
  borderBottom: "1px solid #e6ebf1",
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
  fontWeight: "bold",
  textDecoration: "none",
  padding: "10px 20px",
  display: "inline-block" as const,
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 40px",
};

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 40px",
  textAlign: "center" as const,
};
