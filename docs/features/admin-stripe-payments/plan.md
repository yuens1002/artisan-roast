# Admin Stripe Payments — Plan

**Branch:** `feat/admin-stripe-payments`
**Base:** `main`

---

## Context

Today, configuring Stripe means setting `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` as environment variables on the deployment. There is no admin UI surface for entering or rotating these credentials. That's a setup gap for self-hosted shops: the admin can't configure their own payment processor without dropping into deployment internals.

This feature adds Stripe credential entry + rotation to the existing **Commerce Settings** page, in a renamed top section called **"Stripe Payments & Coupons"**. The existing Promotion Codes content stays in that section (it's already Stripe-Dashboard-linked); we add the credentials form above it. Credentials are stored encrypted at rest in a new `PaymentProcessorConfig` table. The existing env var path remains as the production source of truth — env always wins when both are set, so existing deployments don't break.

**Single-admin, self-hosted scope.** Stripe Connect / multi-tenant flows are explicitly out of scope. This is a "I run my own shop and want to plug in my own Stripe account" feature.

### Stripe-account-first messaging

The admin needs to create their own Stripe account at [dashboard.stripe.com/register](https://dashboard.stripe.com/register) **before** they can paste keys here. The new section's intro flags this prominently with a link, so an admin who hasn't signed up yet doesn't get stuck staring at a form they can't fill.

### Current state (verified during planning)

- [`lib/services/stripe.ts`](../../../lib/services/stripe.ts) — singleton `getStripe()` reads `process.env.STRIPE_SECRET_KEY` directly; returns `null` if unset.
- [`app/api/webhooks/stripe/route.ts`](../../../app/api/webhooks/stripe/route.ts) — reads `process.env.STRIPE_WEBHOOK_SECRET` directly at L23.
- [`lib/validate-env.ts`](../../../lib/validate-env.ts) — Stripe vars are in the **optional** list (the app boots without them; payments just don't work).
- [`docs/architecture/PAYMENTS-ARCHITECTURE.md`](../../architecture/PAYMENTS-ARCHITECTURE.md) — processor-agnostic adapter pattern; the data model design here aligns with that pattern (`processor` field, normalized shape).
- Admin auth convention: `requireAdminApi()` from [`@/lib/admin`](../../../lib/admin) — returns `{ authorized, error? }`. Used in every admin API route surveyed.
- Masked secret display convention: `"••••••••" + key.slice(-4)` — established by [`app/api/admin/settings/ai/route.ts:11-14`](../../../app/api/admin/settings/ai/route.ts#L11). The "don't overwrite stored value with masked value on PUT" trick at L65-67 is reused here.
- Validate-without-saving convention: AI settings route splits `POST` (validate connection) from `PUT` (persist). We mirror this so Stripe validation can run independently of save.

### Why a new model, not `SiteSettings`

`SiteSettings` is a generic K/V store for unstructured strings. Payment credentials need:

- Strict shape per processor (Stripe has 3 fields; PayPal would have different ones).
- Encryption at rest for the secret key and webhook secret (publishable key is public).
- Metadata for display: account ID, account name, last-validated timestamp, test/live mode.
- Future-proofing for multi-processor support per `PAYMENTS-ARCHITECTURE.md`.

A typed Prisma model gives us schema validation, indexed lookups, and a clear extension point.

---

## Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage | New Prisma model `PaymentProcessorConfig` (one row per processor, unique index on `processor`) | Typed schema; future-proof per processor-agnostic architecture; cleaner than encrypted blobs in `SiteSettings` |
| Encryption | AES-256-GCM via Node `crypto` module, key from new env var `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` (32-byte hex/base64) | Standards-based, no new dependency; key separation means DB compromise alone doesn't expose secrets |
| Encryption key fallback | Refuse to save credentials if encryption key not set; show banner explaining how to set it (`openssl rand -hex 32`) | Fail-safe: never silently store unencrypted secrets |
| Env vs DB precedence | **Env wins** when both are set | Backwards compat; existing deployments don't change behavior |
| Validation | Hit `stripe.accounts.retrieve()` on `POST /api/admin/settings/stripe` (validate-only); admin confirms; `PUT` persists | Mirrors AI settings POST/PUT split; surfaces account name + ID + test/live mode before commit |
| Test/live mismatch | **Hard-block** save when secret-key mode and publishable-key mode disagree (`sk_test_*` + `pk_live_*` or inverse) | Always a misconfiguration — fail loudly |
| Auth | `requireAdminApi()` from `@/lib/admin` (existing convention) | Match codebase pattern; no new middleware |
| Masked GET response | `"••••••••" + key.slice(-4)` (matches AI settings) — show last 4 chars for rotation hygiene | Lets admin recognize the stored key without exposing it; matches Stripe Dashboard's own display |
| Don't overwrite on PUT | If incoming `secretKey` starts with `••`, drop it from the update payload (matches AI settings) | Prevents accidentally storing the masked placeholder when admin saves without re-typing |
| Singleton invalidation | New `resetStripeClient()` exported from `lib/services/stripe.ts`, called from PUT and DELETE routes | Prevents stale singleton holding old credentials after rotation |
| Webhook secret access | New `getStripeWebhookSecret()` helper in `lib/services/stripe.ts` (env-then-DB) | Mirrors `getStripe()` pattern; webhook route uses helper instead of reading env directly |
| Test/live mode detection | Derive from key prefix (`sk_test_*` → test, `sk_live_*` → live, `rk_*` → second segment) | No round-trip needed; surfaces visual warning |
| UI placement | Existing `/admin/settings/commerce` page, renamed top section to "Stripe Payments & Coupons" | Coherent — promo codes already live there and reference Stripe Dashboard. No new nav entry |
| API key rotation UX | Single-click: admin re-enters secret key, hits Validate, confirms in modal, hits Save. Same flow as initial setup; `resetStripeClient` runs after persist | "Rotation" isn't a separate code path — it's just re-saving |
| Encryption key rotation | **Out of scope for v1.** If admin rotates `PAYMENT_CREDENTIALS_ENCRYPTION_KEY`, existing DB rows fail to decrypt and admin re-enters keys via the same form. UI surfaces the failure as "Credentials encrypted with a different key — re-enter to re-save." | Covers the case without CLI ceremony; defer auto-rotation tooling until needed |

---

## Data model

### New Prisma model

```prisma
model PaymentProcessorConfig {
  id              String    @id @default(cuid())
  processor       String    @unique  // "stripe" | "paypal" | "square" — matches PaymentProcessor type
  isActive        Boolean   @default(false)

  // Encrypted at rest (AES-256-GCM ciphertext incl. IV + auth tag)
  secretKey       String?
  webhookSecret   String?

  // Stored plaintext (public)
  publishableKey  String?

  // Metadata for display, populated by validation API call
  accountId       String?
  accountName     String?
  isTestMode      Boolean?

  lastValidatedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

Migration name: `add_payment_processor_config`. No data migration required — empty table on first deploy.

### Encryption envelope shape

Encrypted fields are stored as a single string with this serialization:

```text
v1:{base64(iv)}:{base64(authTag)}:{base64(ciphertext)}
```

Versioned prefix lets us rotate the algorithm later without ambiguity. Decryption rejects unknown versions.

---

## Encryption strategy

### Key handling

- New optional env var: `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` — must be 32 bytes (256 bits) encoded as hex (64 chars) or base64.
- Encryption helper at `lib/payments/credentials/encryption.ts`:
  - `encrypt(plaintext: string): string` — generates random 12-byte IV, AES-256-GCM, returns versioned envelope.
  - `decrypt(envelope: string): string` — parses version, splits IV/tag/ciphertext, verifies tag, returns plaintext.
  - Throws when key is missing or invalid format.
- Tests in `lib/payments/credentials/__tests__/encryption.test.ts`: round-trip, tampered ciphertext rejected, wrong key rejected, malformed envelope rejected, version mismatch rejected.

### Key generation guidance

Surfaced in the form's red "Encryption key required" state and in `.env.example`:

```bash
# Generate with: openssl rand -hex 32
PAYMENT_CREDENTIALS_ENCRYPTION_KEY=<64 hex chars>
```

---

## Service layer changes

### `lib/services/stripe.ts` — extended (not replaced)

```typescript
let _stripe: Stripe | null = null;

/**
 * Returns the Stripe client.
 * Resolution order:
 *   1. process.env.STRIPE_SECRET_KEY (existing behavior — env always wins)
 *   2. PaymentProcessorConfig.secretKey for processor='stripe' (decrypted)
 *   3. null
 */
export async function getStripe(): Promise<Stripe | null> { ... }

export function resetStripeClient(): void {
  _stripe = null;
}

/**
 * Resolves the Stripe webhook secret with the same env-then-DB fallback.
 */
export async function getStripeWebhookSecret(): Promise<string | null> { ... }

/**
 * Returns true if Stripe credentials are configured via either env or DB.
 */
export async function isStripeConfigured(): Promise<boolean> { ... }
```

**Breaking change consideration:** `getStripe()` and `isStripeConfigured()` become async. All call sites must `await`. Search confirmed during planning — ~10 files touch these. This is the bulk of the implementation diff and the highest-risk change.

### Webhook route update

```diff
- secret: process.env.STRIPE_WEBHOOK_SECRET,
+ secret: await getStripeWebhookSecret(),
```

---

## Admin UI

### Integration into existing Commerce Settings page

[`app/admin/settings/commerce/page.tsx`](../../../app/admin/settings/commerce/page.tsx) gets a new top section. The existing **"Promotion Codes"** SettingsSection is kept and folded into the renamed **"Stripe Payments & Coupons"** section. Below it stays the existing weight-unit and reviews sections, untouched.

### "Stripe Payments & Coupons" section layout

Top to bottom:

1. **Section title**: "Stripe Payments & Coupons"
2. **Description**: "Configure your Stripe API credentials and promotion code behavior. The same Stripe account powers both."
3. **Stripe-account-first card** — visible to all admins, persistent (not dismissable):
   - Heading: "Don't have a Stripe account yet?"
   - Body: "Create one at [dashboard.stripe.com/register](https://dashboard.stripe.com/register) before entering keys below."
   - External-link icon next to the link.
   - Styled as an info/note card (subtle background, not red/yellow).
4. **Status banner** — current active config:
   - 🟢 "Stripe is configured via environment variables" — env set; UI is for awareness only, DB save will be ignored
   - 🟢 "Stripe is configured via admin UI: \<account-name\>" — DB set, env not set; account name + ID surfaced; test/live mode badge
   - 🟡 "Stripe is not configured" — neither set; payments will not work
   - 🔴 "Encryption key required" — `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` env not set; UI is read-only with `openssl rand -hex 32` instruction
5. **API credentials form**:
   - **Secret key** — password-style input with show/hide toggle. GET returns `••••••••<last4>` when DB-stored. Admin re-enters to change. Test mode warning badge appears live as `sk_test_*` is typed.
   - **Publishable key** — text input, plaintext. Test/live mode warning if it disagrees with secret key's mode.
   - **Webhook secret** — password-style with show/hide. Same masked-placeholder pattern.
   - **Validate** primary button (calls `POST` — non-persisting validation).
     - Calls `stripe.accounts.retrieve()` server-side with the entered secret key.
     - On success: returns account ID, name, country, default currency. Frontend confirms via modal: "Save credentials for `Acme Coffee` (acct_xyz, US, USD)?"
     - On failure: inline error with the Stripe API error message.
     - **Hard-block**: if secret key is `sk_test_*` and publishable key is `pk_live_*` (or inverse), validation fails with "Test/live mode mismatch — secret and publishable keys must be from the same mode."
   - **Save** action (modal Confirm button) calls `PUT` to persist.
   - **Cancel** secondary button — clears form, no save.
6. **Active config display** (shown only when DB row exists):
   - Account ID, account name, last validated, test/live mode badge, source (env-overriding-DB or DB-active).
   - **Clear DB credentials** destructive button (with confirmation modal) — drops the row; subsequent calls fall back to env-only.
7. **Promotion Codes** subsection (kept as-is from existing commerce page) — the Switch + Stripe Dashboard link.

### Route: `app/api/admin/settings/stripe/route.ts`

Three handlers, mirroring AI settings split:

- `GET` — returns active config status (which source is winning, which fields are present, account metadata, encryption-key-set flag, masked last-4 of stored secrets). Never returns plaintext secret values. Auth-guarded.
- `POST` — validation-only. Receives credentials, runs hard-block check (test/live mode mismatch), calls `stripe.accounts.retrieve()`, returns account metadata. Does NOT persist. Auth-guarded.
- `PUT` — persists validated credentials. Re-runs validation server-side (don't trust the client to have validated). Encrypts, upserts to DB. Calls `resetStripeClient()` after save. Auth-guarded.
- `DELETE` — drops the DB row (does not affect env). Calls `resetStripeClient()`. Auth-guarded.

Zod schema:

```typescript
const StripeUpdateSchema = z.object({
  secretKey: z.string().regex(/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/).optional(),
  publishableKey: z.string().regex(/^pk_(test|live)_[A-Za-z0-9]+$/).optional(),
  webhookSecret: z.string().regex(/^whsec_[A-Za-z0-9]+$/).optional(),
});
```

PUT preprocesses the body: any field starting with `••` is dropped from the update set (admin didn't change it; preserves stored value).

---

## Env fallback semantics

| `STRIPE_SECRET_KEY` env | DB row | `getStripe()` returns | UI banner |
|---|---|---|---|
| set | absent | client built from env | "Configured via environment variables" |
| set | present | client built from env (DB ignored) | "Environment variables override DB; clear env to use admin UI" |
| unset | absent | null | "Not configured" |
| unset | present (decryptable) | client built from DB | "Configured via admin UI: \<account\>" |
| unset | present (decryption fails) | null + console.error | "Credentials encrypted with a different key — re-enter to re-save" |

`STRIPE_WEBHOOK_SECRET` follows the same matrix.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is build-time inlined; admin UI for it is informational. The form lets the admin paste the publishable key for completeness (validated to match the secret key's account + mode), but the live storefront still uses the env-baked value until next build. We surface this caveat in the UI.

---

## UX Flows

| Flow | Question | Answer |
|---|---|---|
| First-time admin (no Stripe account) | What does the admin see? | Stripe-account-first card surfaced at the top; link to dashboard.stripe.com/register; form is enabled but they're directed to sign up first |
| Post-action (save) | What happens after Save succeeds? | Confirmation modal closes, page re-fetches GET, "Active config" section re-renders, success toast |
| Post-action (rotate) | How does the admin rotate the key? | Same form: paste new secret key → Validate → confirm in modal → Save. Single click after validation. `resetStripeClient` ensures next request uses the new key. |
| Post-action (clear) | What happens after Clear DB credentials? | Confirmation modal closes, GET re-fetches, banner returns to env or "not configured" state, info toast |
| Response | How does the admin verify it worked? | (1) Account name + ID surfaced in the validate modal before save; (2) "Active config" section shows the same after save; (3) Try a checkout to confirm end-to-end |
| Error (Stripe API) | What does the admin see when validation fails? | Inline error under the secret key field with the Stripe API error verbatim; Save not invoked |
| Error (test/live mismatch) | What does the admin see? | Inline error: "Test/live mode mismatch — secret key is test, publishable key is live (or inverse). Both must be from the same Stripe mode." |
| Empty | What does the admin see with no config? | Yellow banner explaining payments aren't set up; form enabled if encryption key is present |
| Loading | What does the admin see while validating? | Validate button shows spinner + "Validating with Stripe…"; form fields disabled |
| Encryption-key-missing | What does the admin see? | Red banner with `openssl rand -hex 32` instructions; form is **disabled** |

---

## Files Changed

| File | Type | Notes |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `PaymentProcessorConfig` model |
| `prisma/migrations/{ts}_add_payment_processor_config/migration.sql` | New | Auto-generated by `prisma migrate dev` |
| `lib/payments/credentials/encryption.ts` | New | AES-256-GCM encrypt/decrypt with versioned envelope |
| `lib/payments/credentials/__tests__/encryption.test.ts` | New | Round-trip + tampering + wrong-key tests |
| `lib/payments/credentials/index.ts` | New | DB access: `loadStripeCredentials()`, `saveStripeCredentials()`, `clearStripeCredentials()` |
| `lib/payments/credentials/__tests__/index.test.ts` | New | DB read/write + Prisma mock tests |
| `lib/services/stripe.ts` | Modify | Make `getStripe()` async with env-then-DB fallback; add `resetStripeClient()`, `getStripeWebhookSecret()`, async `isStripeConfigured()` |
| `lib/services/__tests__/stripe.test.ts` | New | Test fallback semantics: env-only, DB-only, both, neither |
| `lib/validate-env.ts` | Modify | Add `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` to optional list |
| `app/api/webhooks/stripe/route.ts` | Modify | Use `getStripeWebhookSecret()` |
| `app/api/checkout/route.ts` + `app/api/checkout/redirect/route.ts` | Modify | Update `getStripe()` calls to await |
| `app/(site)/_components/cart/ShoppingCart.tsx` | Modify | Update `isStripeConfigured()` to receive server data (component is server or has server prop) |
| `app/admin/orders/page.tsx` | Modify | Update `getStripe()` calls to await |
| `app/api/health/route.ts` | Modify | Update `isStripeConfigured()` calls |
| `app/admin/settings/commerce/page.tsx` | Modify | Add new "Stripe Payments & Coupons" section above existing Promotion Codes; integrate StripeCredentialsForm |
| `app/admin/settings/commerce/_components/StripeCredentialsForm.tsx` | New | Form component with validation modal, status banner, account-first card |
| `app/api/admin/settings/stripe/route.ts` | New | GET / POST / PUT / DELETE handlers using `requireAdminApi`, Zod, encryption |
| `app/api/admin/settings/stripe/__tests__/route.test.ts` | New | Auth, validation, encryption-on-save, test/live mismatch, singleton-reset tests |
| `.env.example` | Modify | Add `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` with generation instructions |
| `docs/architecture/PAYMENTS-ARCHITECTURE.md` | Modify | Add "Credential Storage" section documenting env-vs-DB precedence |

**Estimated diff size:** ~21 files, ~1000 LoC. Riskiest changes: `getStripe()` becoming async (touches checkout and webhook hot paths). Smaller than the original separate-page plan because we're not adding nav entries or a standalone page.

---

## Commit Schedule

| # | Message | Files | Risk |
|---|---------|-------|------|
| 0 | `docs: add plan + ACs for admin Stripe payments` | plan.md + acs.md | — |
| 1 | `feat(payments): add PaymentProcessorConfig Prisma model` | schema + migration | Low |
| 2 | `feat(payments): add credential encryption helper (AES-256-GCM)` | `lib/payments/credentials/encryption.ts` + tests | Low |
| 3 | `feat(payments): add credential DB-access layer` | `lib/payments/credentials/index.ts` + tests | Low |
| 4 | `refactor(stripe): make getStripe() async with env-then-DB fallback` | `lib/services/stripe.ts` + tests + all call sites | **Medium** (touches checkout + webhook) |
| 5 | `feat(api): admin Stripe credentials GET/POST/PUT/DELETE` | `app/api/admin/settings/stripe/route.ts` + tests | Medium |
| 6 | `feat(admin): Stripe credentials form on Commerce settings` | commerce page + StripeCredentialsForm component | Low–Medium |
| 7 | `docs: env example + PAYMENTS-ARCHITECTURE updates` | `.env.example`, `PAYMENTS-ARCHITECTURE.md` | Low |
| 8 | `chore: bump version to X.Y.Z` (release skill produces this) | package.json, package-lock.json, CHANGELOG.md | — |

---

## Acceptance Criteria

### UI (verified by screenshots)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-UI-1 | `/admin/settings/commerce` page on initial load (env set, DB empty) | Screenshot: viewport at desktop breakpoint after admin login | New "Stripe Payments & Coupons" section is the top section; status banner says "Configured via environment variables"; form is present below banner; existing Promotion Codes subsection still renders below |
| AC-UI-2 | Stripe-account-first card visible | Screenshot: viewport showing top of section | Card with link to dashboard.stripe.com/register is visible above the status banner; external-link icon present |
| AC-UI-3 | Page in env-unset, DB-empty, encryption-key-set state | Screenshot: viewport after `STRIPE_SECRET_KEY` removed from `.env.local` | Status banner: "Not configured" (yellow); form fields are enabled; Validate button enabled |
| AC-UI-4 | Page in encryption-key-NOT-set state | Screenshot: viewport after `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` removed | Status banner: "Encryption key required" (red) with `openssl rand -hex 32` instruction; form is **disabled** |
| AC-UI-5 | Test mode warning while typing `sk_test_*` | Interactive: focus secret key field, type `sk_test_abc` → screenshot | Yellow "Test Mode" badge appears next to the field |
| AC-UI-6 | Show/hide toggle on secret key field | Interactive: click eye-icon button → screenshot | Field changes from password to text type; characters become visible |
| AC-UI-7 | Validation modal after successful Validate | Exercise: enter valid test keys, click Validate → wait for modal → screenshot | Modal shows "Save credentials for `Acme Coffee` (acct_xyz, US, USD)?" with Save + Cancel buttons |
| AC-UI-8 | Inline error on test/live mismatch | Exercise: enter `sk_test_*` + `pk_live_*`, click Validate → screenshot | Inline error: "Test/live mode mismatch — secret key is test, publishable key is live. Both must be from the same Stripe mode." Save flow does not advance |
| AC-UI-9 | Inline error on bad secret key | Exercise: enter `sk_test_invalid`, click Validate → screenshot | Inline error under the secret key field showing the Stripe API error verbatim |
| AC-UI-10 | Active config section after successful save | Screenshot: viewport after confirming the validation modal | "Active config" subsection shows account name, account ID, last validated timestamp, test/live mode badge |
| AC-UI-11 | Masked stored secret key on page reload | Screenshot: viewport after navigating away and returning to the page | Secret key field shows `••••••••<last4>` placeholder; admin must re-enter to change |
| AC-UI-12 | Clear DB credentials confirmation modal | Interactive: click Clear → wait for modal → screenshot | Modal asks "This will remove DB-stored credentials. Stripe will fall back to environment variables. Continue?" with Confirm + Cancel |

### Functional (verified by code review)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-FN-1 | Auth guard via `requireAdminApi` on all 4 methods | Code review: `app/api/admin/settings/stripe/route.ts` | Each handler calls `requireAdminApi()` and returns 401 with the helper's error when unauthorized |
| AC-FN-2 | Zod validation on POST + PUT bodies | Code review: route file → trace schemas | Schemas reject malformed keys (regex check); 400 with details on failure |
| AC-FN-3 | `stripe.accounts.retrieve()` called on POST and re-called on PUT | Code review: route file → trace validation | Real Stripe API call wrapped in try/catch on both methods; 400 with Stripe message on failure; success extracts account metadata |
| AC-FN-4 | Test/live mismatch hard-block | Code review: route file → trace mismatch check | Both POST and PUT compare secret + publishable mode; return 400 with mismatch error before calling Stripe |
| AC-FN-5 | Encryption applied to secret key + webhook secret on PUT | Code review: route file → trace encrypt() calls | Both fields passed through `encrypt()` before `prisma.paymentProcessorConfig.upsert`; publishable key NOT encrypted |
| AC-FN-6 | "Don't overwrite with masked value" preprocessing on PUT | Code review: route file → trace mask-prefix check | If `secretKey?.startsWith("••")` (or `webhookSecret`), drop from update payload |
| AC-FN-7 | `getStripe()` env-then-DB resolution order | Code review: `lib/services/stripe.ts` → trace function | Returns env-built client when env set; DB-built client only when env unset; null when both unset |
| AC-FN-8 | `getStripeWebhookSecret()` mirrors `getStripe()` precedence | Code review: `lib/services/stripe.ts` | Same env-then-DB-then-null shape |
| AC-FN-9 | `resetStripeClient()` called from successful PUT and DELETE | Code review: route file → trace post-save calls | Singleton cleared so next `getStripe()` re-reads from current source |
| AC-FN-10 | Webhook route uses `getStripeWebhookSecret()` not `process.env` | Code review: `app/api/webhooks/stripe/route.ts` | No `process.env.STRIPE_WEBHOOK_SECRET` read in this file after this change |
| AC-FN-11 | DELETE drops DB row but doesn't touch env | Code review: route file → trace DELETE handler | `prisma.paymentProcessorConfig.delete()` called; no env mutation; resetStripeClient called |
| AC-FN-12 | GET response masks secrets matching AI settings convention | Code review: route file → trace `maskApiKey` usage | Stored secret returned as `"••••••••" + last4`; absent secret returned as empty string |

### Test Coverage

| AC | What | How | Pass |
|----|------|-----|------|
| AC-TST-1 | Encryption round-trip + tampering | Test run: `npm run test:ci` | `encrypt(x)` → `decrypt(...)` recovers `x`; tampered ciphertext throws; wrong key throws; malformed envelope throws; version mismatch throws |
| AC-TST-2 | DB access layer with mocked Prisma | Test run: `npm run test:ci` | `loadStripeCredentials()` returns null on empty table, decrypted creds when row exists, null + console.error on decryption failure |
| AC-TST-3 | `getStripe()` env-then-DB resolution | Test run: `npm run test:ci` | 4 cases: env-only / DB-only / both (env wins) / neither (null) |
| AC-TST-4 | PUT validation + encryption + reset | Test run: `npm run test:ci` | Mocked Stripe call; assert encrypted blob written to DB (not plaintext); assert resetStripeClient called; assert masked-prefix preprocessing |
| AC-TST-5 | Test/live mismatch hard-block | Test run: `npm run test:ci` | POST and PUT both reject with 400 when modes disagree, BEFORE calling Stripe |
| AC-TST-6 | DELETE auth + side effects | Test run: `npm run test:ci` | 401 on unauth; deletes row; calls resetStripeClient |

### Regression (verified by test suite + spot-check)

| AC | What | How | Pass |
|----|------|-----|------|
| AC-REG-1 | Existing test suite | Test run: `npm run test:ci` | All pre-existing tests pass after `getStripe()` becomes async (call sites updated) |
| AC-REG-2 | Existing checkout flow with env-set credentials | Exercise: env set, no DB row → add product → checkout → screenshot success page | Stripe Checkout session creates and redirects; success page renders |
| AC-REG-3 | Existing webhook signature verification | Test run: `lib/payments/stripe/__tests__/verify.test.ts` (or equivalent) | Tests pass — signature verification still works |
| AC-REG-4 | Health check endpoint Stripe-configured state | Code review: `app/api/health/route.ts` | Returns `stripe.configured: true` when env OR DB is set |
| AC-REG-5 | Existing Promotion Codes section behavior | Screenshot: same commerce page after change → click promo-code Switch | Promo-codes Switch still works; Stripe Dashboard external link still present; behavior identical to before |

**Total: 27 ACs** (12 UI + 12 FN + 6 TST + 5 REG)

---

## Verification & Workflow Loop

After plan approval:

1. Commit plan + ACs to branch (`docs: add plan + ACs for admin Stripe payments`)
2. Update `verification-status.json`: `{ status: "planned", acs_total: 27 }`
3. Extract ACs into `docs/features/admin-stripe-payments/acs.md` from template
4. Transition to `"implementing"` when coding begins (after Commit 1)

After implementation:

1. Transition to `"pending"`
2. Run `npm run precheck` + `npm run test:ci`
3. Spawn `/ac-verify` sub-agent
4. Main thread reads report, fills **QC** column
5. Iterate until all 27 pass
6. Hand off to human → fills **Reviewer** column → approve

---

## Out of Scope (explicit)

- **Stripe Connect / multi-tenant** — single-admin self-hosted only
- **Webhook endpoint creation API** — admin still copies `whsec_*` from Stripe Dashboard manually; no auto-creation
- **Audit log** of credential rotations — interesting v2 addition, not blocking
- **Multiple Stripe accounts** (e.g., test + live side by side) — single active account; admin toggles by re-entering keys
- **PayPal / Square** — model is processor-agnostic but only Stripe shipped
- **Frontend `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` runtime swap** — build-time inlined; UI surfaces the caveat but doesn't fix
- **Encryption-key rotation tooling** — defer until needed; recovery path is "admin re-enters keys" via the same form
- **Stripe account creation flow** — admin creates account at dashboard.stripe.com themselves; we link, we don't embed

---

## Post-MVP Iteration — Validation Hardening + UX Polish

After the initial 7-commit implementation shipped, manual testing surfaced validation gaps and UX friction points that required follow-up work before the PR could open. This section documents what changed and why — the original plan above reflects the intended design; this section reflects what actually shipped.

### Design pivots from original plan

| Original plan | What actually shipped | Why it changed |
|---|---|---|
| `POST` = validate-only (no save); confirmation modal; `PUT` = save | No modal — single-step `PUT` validates+saves inline; `POST` repurposed as re-verify-stored-credentials (powers Verify button) | The confirmation modal added round-trip friction without preventing errors. The validation chain on `PUT` is the confirmation step. `POST` is more useful as a read-only diagnostic re-verify tool for the "everything looks green but payments fail" scenario |
| Zod schema enforces key format with regex | Zod schema is permissive (`z.string().optional()`); format checks done imperatively after mask-drop, before any API call | Masked placeholder values (`••••••••1234`) don't match the regex; permissive schema + manual imperative checks avoids pre-filtering the mask-drop logic and is easier to reason about |
| `stripe.accounts.retrieve()` called on `POST` and re-called on `PUT` | `accounts.retrieve()` called only on `PUT` (when a new secretKey is provided); `POST` calls the same chain against stored credentials | Eliminates the two-step client flow; server always re-validates before persisting |
| `charges_enabled` checked for all key modes | `charges_enabled` guard skipped for test-mode keys | `charges_enabled` is a live-mode onboarding flag. Test accounts can have it `false` while fully supporting test charges. Guard without the mode check produced false-positive "account not enabled" errors for valid test keys |
| Inline validation chain: mismatch → `accounts.retrieve()` → save | Extended chain: mismatch → `accounts.retrieve()` → `charges_enabled` (live only) → `runTestCharge()` (test only) → `verifyPublishableKey()` → save | Each step caught a real-world failure mode that the simpler chain missed |

### Actual validation chain (PUT)

Every `PUT` runs this chain when a new `secretKey` is in the payload:

```text
1. Mask-drop  — fields starting with "••" are stripped (admin didn't change them)
2. Short-circuit — if no field changed, return 200 immediately (server handles empty body)
3. Format check — /^sk_(test|live)_/ / /^pk_(test|live)_/ / /^whsec_/ before any API work
4. Effective-set resolution — if only one of the secret/publishable pair is in the payload,
   load the other from DB so the consistency check has both values
5. Mode mismatch — hard-block if effectiveSecretKey mode ≠ effectivePublishableKey mode
6. stripe.accounts.retrieve() — confirms the secret key is valid + active
7. charges_enabled (live-mode only) — skipped for sk_test_* keys (false-positive fix)
8. runTestCharge() (test-mode only) — creates + immediately cancels a test PaymentIntent
   to verify payment capability independently of charges_enabled
9. verifyPublishableKey() — creates an unconfirmed PI with the secret key, then retrieves
   it via Stripe's API with the publishable key as Bearer auth; a different-account key
   returns 4xx
10. saveStripeCredentials() + resetStripeClient()
```

Steps 4–9 all return the same generic `GENERIC_ERROR` message on failure to avoid leaking which check failed or exposing key fragments.

### Publishable key cross-account verification (step 9)

Original plan had no mechanism for verifying the publishable key belongs to the same Stripe account as the secret key. Client-side Stripe.js verification would require a two-phase save with server-side session storage of pending credentials. The server-side approach chosen:

1. Create an unconfirmed `PaymentIntent` using the secret key (`amount: 50`, no `confirm: true`)
2. Retrieve it via `GET /v1/payment_intents/{id}?client_secret={cs}` with the publishable key as `Bearer` auth
3. Stripe returns 4xx if the keys are from different accounts — return `false`
4. Always cancel the PI in a `finally` block regardless of outcome
5. `verifyPublishableKey` uses `effectiveSecretKey`/`effectivePublishableKey` so it always validates the post-update pair, even when only one of the pair was submitted

### UX additions not in original plan

**Inline field icons** — each field displays a contextual icon next to it:

- `text-emerald-500` checkmark: field value matches the DB-stored state (clean/verified)
- `text-muted-foreground/30` circle: field is dirty (typed, not yet saved)
- `text-destructive` X: previous save errored on this field

**Dirty field tracking** — `PUT` body contains only the fields the admin actually changed. Masked placeholder values (`••` prefix) are stripped before the body is assembled, so an unchanged sensitive field sends nothing — the server preserves the existing encrypted value rather than overwriting it.

**Required field validation** — when `db.hasRow` is false (no saved keys), all three fields are required before Save can proceed. Client-side validation fires on the save attempt and shows "Required field" inline. Errors clear as the admin types.

**Undo Changes button** — appears after a failed save, but only when `db.hasSecretKey === true` (there is a previously-validated state to revert to). Clicking Undo:

1. Restores all three field values to their DB state (masked for secret/webhook, plaintext for publishable)
2. Clears the inline error
3. Hides the Undo button itself
4. Resets field icons to green (verified state)

Rationale: when a save fails because the admin typed a bad key, there's a known-good state in the DB. Undo provides a one-click escape hatch without requiring a page reload.

**Verify button** — secondary/outline button left of Save, visible when `db.hasRow && db.hasSecretKey`. Calls `POST /api/admin/settings/stripe` which re-runs the full validation chain against the stored credentials (read-only — no `saveStripeCredentials` call). Useful for diagnosing payment failures when all settings look correct. Disabled when:

- Any field is dirty (unsaved form state would make "All checks passed" misleading)
- A save operation is in progress
- The previous save errored (fields may be in an inconsistent state)

### Additional tests added

| File | Coverage added beyond original commit schedule |
|---|---|
| `app/api/admin/settings/stripe/__tests__/route.test.ts` | Publishable key cross-account mismatch → 400; `charges_enabled` check updated to use live-mode key (test for the false-positive fix); 7-test `POST` describe block: 401, no creds stored, bad secret key, `charges_enabled` disabled on live (not test), test charge failure, wrong pub-key account, all-pass + no DB writes |
| `app/admin/settings/commerce/_components/__tests__/StripeCredentialsForm.test.tsx` | Required field validation (3 tests); field icon state (3 tests); dirty field tracking — `PUT` body shape assertions (3 tests); Undo Changes button lifecycle (6 tests: not shown initially, not shown while editing, appears after failed save with DB state, not shown without valid DB secret, click restores values + clears error, not shown after successful save) |
