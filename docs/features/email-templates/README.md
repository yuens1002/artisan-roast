# Email Template Architecture

> Guide for building and maintaining transactional email templates.

---

## Directory Structure

```text
emails/
  _components.tsx   # Shared components: EmailLayout, Divider, ContainedSection, etc.
  _styles.ts        # Shared styles — single source of truth for layout, typography, colours
  *.tsx             # Individual email templates (one per file)
```

---

## Core Concepts

### EmailLayout

Every template is wrapped in `EmailLayout` from `_components.tsx`. It renders the
common shell (`Html > Head > Preview > Body > Container > … > Footer`) so
templates only provide their unique content as children.

```tsx
<EmailLayout preview="Your order has shipped!" {...branding}>
  {/* template-specific content here */}
</EmailLayout>
```

**What EmailLayout handles:**

- `<Html>`, `<Head />`, `<Preview>`
- `<Body>` with shared background style
- `<Container>` with max-width and padding
- `<Footer>` with store logo/name and URL (rendered last, after children)

**What templates handle:**

- Headings, body text, sections, buttons
- `<Divider />` placement (used as content separators — varies per template)
- Template-specific local styles

### EmailBranding

A shared interface declared once in `_components.tsx`:

```ts
export interface EmailBranding {
  storeName?: string;
  logoUrl?: string | null;
}
```

Every template interface extends it. This eliminates per-template `storeName`
and `logoUrl` declarations. Branding values come from the database
(`SiteSettings` table via `getEmailBranding()` in the email sender) — never
hardcoded.

### APP_URL

```ts
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
```

Exported from `_components.tsx`. Import it when building links within
templates. Never hardcode a domain.

---

## Creating a New Template

### 1. Create the file

```text
emails/NewFeatureEmail.tsx
```

### 2. Define the interface

Extend `EmailBranding` for branding props. Only declare template-specific
props in the interface.

```tsx
import type { EmailBranding } from "./_components";

interface NewFeatureEmailProps extends EmailBranding {
  customerName: string;
  featureUrl: string;
}
```

### 3. Write the component

Two patterns depending on whether `storeName` is used in the template body.

**Pattern A — storeName NOT used in body** (most templates):

```tsx
import { Heading, Link, Section, Text } from "@react-email/components";
import type { EmailBranding } from "./_components";
import { APP_URL, Divider, EmailLayout } from "./_components";
import * as s from "./_styles";

interface NewFeatureEmailProps extends EmailBranding {
  customerName: string;
  featureUrl: string;
}

export default function NewFeatureEmail({
  customerName,
  featureUrl,
  ...branding
}: NewFeatureEmailProps) {
  return (
    <EmailLayout preview="Check out the new feature!" {...branding}>
      <Heading style={s.h1}>New Feature Available</Heading>

      <Text style={s.text}>Hi {customerName},</Text>
      <Text style={s.text}>We just launched something new.</Text>

      <Section style={s.buttonSection}>
        <Link style={s.button} href={featureUrl}>
          Try It Out
        </Link>
      </Section>

      <Divider />
    </EmailLayout>
  );
}
```

Key points:

- `...branding` collects `storeName` and `logoUrl` via rest spread
- `{...branding}` passes them to `EmailLayout` in one shot
- No explicit `storeName` or `logoUrl` references anywhere in the template

**Pattern B — storeName used in body** (Preview text, headings, etc.):

```tsx
export default function WelcomeEmail({
  customerName,
  storeName,
  ...branding
}: WelcomeEmailProps) {
  return (
    <EmailLayout
      preview={`Welcome to ${storeName ?? ""}`}
      storeName={storeName}
      {...branding}
    >
      <Heading style={s.h1}>Welcome to {storeName}!</Heading>
      <Text style={s.text}>Hi {customerName}, thanks for joining.</Text>
      <Divider />
    </EmailLayout>
  );
}
```

Key points:

- Destructure `storeName` explicitly so it can be used in JSX
- Pass `storeName={storeName}` to `EmailLayout` (so Footer receives it)
- Spread `{...branding}` for `logoUrl` (and any future branding props)
- Use `storeName ?? ""` in the `preview` prop (it must be a `string`, not
  `string | undefined`)

### 4. Write the sender

Email senders live in `lib/email/`. They fetch branding from the DB and pass
it to the template.

```tsx
import { getEmailBranding } from "@/lib/config/app-settings";
import NewFeatureEmail from "@/emails/NewFeatureEmail";

export async function sendNewFeatureEmail(data: { ... }) {
  const { storeName, logoUrl } = await getEmailBranding();

  const html = await render(
    NewFeatureEmail({
      customerName: data.customerName,
      featureUrl: data.featureUrl,
      storeName,
      logoUrl,
    })
  );

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
    to: data.email,
    subject: "New feature available",
    html,
  });
}
```

`getEmailBranding()` reads `store_name` and `store_logo_url` from the
`SiteSettings` table and resolves relative logo paths to absolute URLs.

---

## Shared Components Reference

All from `_components.tsx`:

| Component | Purpose |
|---|---|
| `EmailLayout` | Common shell — wraps content with Html/Head/Preview/Body/Container/Footer |
| `Divider` | Horizontal rule within 40px side padding — use as content separator |
| `ItemDivider` | Thin line between order items (lighter than Divider) |
| `ContainedSection` | Wraps coloured/bordered boxes within the 40px side padding |
| `Footer` | Store logo or name + store URL (internal to EmailLayout — do not use directly) |

### ContainedSection usage

React Email `<Section>` renders as `<table width="100%">`. Horizontal margin
on a full-width table causes overflow. `ContainedSection` applies padding on
an outer `<Section>` wrapper to keep content within bounds.

```tsx
<ContainedSection innerStyle={s.infoBox}>
  <Text style={s.infoBoxLabel}>Tracking Number</Text>
  <Text style={s.infoBoxValue}>{trackingNumber}</Text>
</ContainedSection>
```

The `innerStyle` prop accepts any pre-defined style object from `_styles.ts`
(e.g., `s.highlightSection`, `s.alertSection`, `s.infoBox`) or a local style
object for one-off designs.

---

## Shared Styles Reference

All from `_styles.ts`. Import as `import * as s from "./_styles"`.

### Layout

| Style | Description |
|---|---|
| `s.main` | `<Body>` background (handled by EmailLayout) |
| `s.container` | `<Container>` max-width and padding (handled by EmailLayout) |

### Typography

| Style | Description |
|---|---|
| `s.h1` | Primary heading (28px, bold, 40px side padding) |
| `s.h2` | Secondary heading (20px, bold) |
| `s.text` | Body text (16px, 40px side padding) |
| `s.textSm` | Small text (14px) |

### Sections

| Style | Description |
|---|---|
| `s.detailSection` | White-background label/value section |
| `s.detailLabel` | Uppercase small label (12px, gray) |
| `s.detailValue` | Value text (16px) |
| `s.highlightSection` | Amber background with left border (key info) |
| `s.alertSection` | Red background with left border (errors, flags) |
| `s.infoBox` | Neutral gray background with border |
| `s.subscriptionBanner` | Green banner for subscription info |
| `s.infoBanner` | Blue banner for informational messages |

### Buttons

| Style | Description |
|---|---|
| `s.buttonSection` | Wrapper with 40px side padding and vertical margin |
| `s.button` | Primary CTA — brown, full-width, bold |
| `s.buttonSecondary` | Secondary CTA — gray, full-width |

### Order Items

| Style | Description |
|---|---|
| `s.itemSection` | Item row padding |
| `s.itemName` | Product name (16px, semibold) |
| `s.itemMeta` | Variant / subscription info (14px, gray) |
| `s.itemPrice` | Price line (14px) |

---

## Conventions

### Do

- Extend `EmailBranding` — never declare `storeName` or `logoUrl` manually
- Use `EmailLayout` — never render `<Html>`, `<Body>`, `<Container>`, or
  `<Footer>` directly
- Use `APP_URL` for all links — never hardcode a domain
- Use shared styles from `_styles.ts` for consistent spacing, typography, and
  colours
- Use `ContainedSection` for coloured/bordered blocks
- Keep template-specific styles as `const` objects at the bottom of the file
- Use `as const` for style properties that TypeScript can't infer
  (`fontWeight`, `textAlign`, `whiteSpace`)
- Use `process.env.RESEND_FROM_EMAIL` for the sender address in senders
- Fetch branding with `getEmailBranding()` in the sender, not the template

### Don't

- Don't hardcode store names, domains, or URLs in templates
- Don't set fallback/default values for `storeName` or `logoUrl` in templates
  — if not set, render nothing (empty string / no image)
- Don't import `Footer` directly — `EmailLayout` renders it
- Don't import `Html`, `Head`, `Preview`, `Body`, or `Container` from
  `@react-email/components` — `EmailLayout` handles these
- Don't use horizontal margin on `<Section>` — it causes overflow (use
  `ContainedSection` or padding instead)

---

## Existing Templates

| Template | Type | Uses storeName in body? |
|---|---|---|
| `ContactFormEmail` | Admin notification | No |
| `DeliveryConfirmationEmail` | Customer notification | No |
| `FailedOrderNotification` | Customer notification | No |
| `MerchantOrderNotification` | Admin notification | No |
| `NewReviewNotification` | Admin notification | Yes (preview) |
| `NewsletterSignupNotification` | Admin notification | No |
| `NewsletterWelcomeEmail` | Customer notification | Yes (preview, heading) |
| `OrderConfirmationEmail` | Customer notification | Yes (preview, pickup location) |
| `PasswordResetEmail` | Customer notification | Yes (preview, body text) |
| `PickupReadyEmail` | Customer notification | No |
| `ReviewRequestEmail` | Customer notification | Yes (preview) |
| `ShipmentConfirmationEmail` | Customer notification | No |

---

## Branding Flow

```text
Admin Settings UI (/admin/settings)
        │
        ▼
  SiteSettings table (store_name, store_logo_url)
        │
        ▼
  getEmailBranding()  ← called by email sender (lib/email/)
        │
        ▼
  { storeName, logoUrl } passed as props to template
        │
        ▼
  Template spreads to EmailLayout → Footer renders logo/name + URL
```

Logo URL resolution: if `store_logo_url` is a relative path (e.g., `/logo.svg`),
`getEmailBranding()` resolves it to an absolute URL using `NEXT_PUBLIC_APP_URL`.
Email clients cannot render relative paths.
