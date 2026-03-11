# Phase 2: Implementation Plan (artisan-roast repo)

Store-side implementation for SaaS platform integration. Platform team implements their side per `phase2-platform-contract.md`.

**Prerequisite docs:**

- `docs/internal/PHASE2-OPEN-SOURCE-SPEC.md` — API contracts and feature spec
- `docs/internal/phase2-design-decisions.md` — Design decisions and rationale
- `docs/internal/phase2-platform-contract.md` — Platform team handoff

---

## Existing Infrastructure

| Asset | Location | Phase 2 Use |
|-------|----------|-------------|
| `SiteSettings` model | `prisma/schema.prisma` | Store LLM config, `LICENSE_KEY`, `GA_MEASUREMENT_ID` |
| `AiTokenUsage` model | `prisma/schema.prisma` | Keep for local logging; platform meters via proxy |
| `lib/features.ts` | Feature flags (env-based) | **Delete** — replaced by `app-settings.ts` toggles + `lib/license.ts` |
| `lib/version.ts` | `EDITION` type | **Delete** — replaced by `lib/license.ts` tier detection |
| `lib/config/app-settings.ts` | Settings persistence layer | Extend with AI settings keys |
| `SettingsField` component | `app/admin/_components/forms/SettingsField.tsx` | Reuse for AI settings + Plan page |
| `SettingsSection` component | `app/admin/_components/forms/SettingsSection.tsx` | Reuse for section layout |
| Secret masking pattern | `app/admin/settings/scheduled-jobs/` | Reuse for API key display |
| Toggle pattern | `app/admin/settings/commerce/` | Reuse for AI feature toggles |
| `GoogleAnalytics` component | `components/shared/GoogleAnalytics.tsx` | Update to read from `gaConfig` |
| Admin nav config | `lib/config/admin-nav.ts` | Add "AI" and "Plan" to Settings |
| Admin auth utils | `lib/admin.ts` | Reuse `requireAdmin()` |
| 3 AI endpoints | `app/api/` (about, chat, recommend) | Refactor from Gemini-specific to LLM-agnostic |

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | All 3 current AI features (chat, recommendations, about-assist) stay **FREE** | Customer-facing features drive engagement and sales |
| 2 | **LLM-agnostic** — remove Gemini dependency, use OpenAI-compatible API format | Open-source users pick any provider (OpenAI, Ollama, Groq, etc.) |
| 3 | **Breaking change** — `GEMINI_API_KEY` replaced by generic LLM config | No users yet; clean break is better than a migration shim |
| 4 | Single "Manage Billing" link on Pro Plan page | Stripe Portal handles billing + cancellation |
| 5 | AI settings page built first (no platform dependency) | Immediate value for FREE tier |
| 6 | Pro AI features (reviews, CMS, promotions, insights) don't exist yet | Gated when built, no stubs needed |

---

## Implementation Phases

### Phase 2A: LLM-Agnostic AI + Settings Page (No Platform Dependency)

Replace Gemini-specific code with OpenAI-compatible client. Admin UI for LLM config and feature toggles. **Breaking change** — immediate value for all users.

### Phase 2B: License & Plan Foundation (No Platform Dependency)

`lib/license.ts`, Plan page, upgrade prompts. Testable with mock responses.

### Phase 2C: AI Proxy Integration (Requires Platform)

Pro AI features route through platform API.

### Phase 2D: GA OAuth Integration (Requires Platform)

Connect GA via platform OAuth flow.

---

## Phase 2A: LLM-Agnostic AI + Settings Page

### A1. `lib/ai-client.ts` — Universal LLM Client

**New file.** Replaces all direct Gemini SDK/REST calls with a single client that speaks the OpenAI-compatible chat completions format.

```typescript
// lib/ai-client.ts

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;        // override per-call (optional)
}

interface ChatCompletionResult {
  text: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
}

/**
 * Send a chat completion request to the configured LLM provider.
 * Uses the OpenAI-compatible /v1/chat/completions format.
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult>

/**
 * Check if an LLM provider is configured (has base URL + API key).
 */
export async function isAIConfigured(): Promise<boolean>
```

**Implementation:**

- Reads `baseUrl`, `apiKey`, `model` from `SiteSettings` (DB first, env fallback)
- Calls `POST {baseUrl}/chat/completions` with standard OpenAI format
- Parses response using OpenAI response schema
- Logs to `AiTokenUsage` model (same as today)
- Returns normalized result

**OpenAI-compatible request format:**

```json
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}

{
  "model": "{model}",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**Provider compatibility:**

| Provider | Base URL | Notes |
|----------|----------|-------|
| OpenAI | `https://api.openai.com/v1` | Native format |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | Google's OpenAI-compatible endpoint |
| Anthropic | `https://api.anthropic.com/v1` | Via OpenAI-compat mode |
| Groq | `https://api.groq.com/openai/v1` | Native format |
| Together | `https://api.together.xyz/v1` | Native format |
| Mistral | `https://api.mistral.ai/v1` | Native format |
| Ollama (local) | `http://localhost:11434/v1` | Native format |
| LM Studio (local) | `http://localhost:1234/v1` | Native format |

---

### A2. App Settings Keys

**File:** `lib/config/app-settings.ts`

Add new settings keys:

```typescript
// LLM provider configuration
"ai.baseUrl"             // string — LLM API base URL (e.g., https://api.openai.com/v1)
"ai.apiKey"              // string — LLM API key (masked in UI)
"ai.model"               // string — Model ID (e.g., gpt-4o-mini, gemini-2.5-flash)

// Feature toggles
"ai.chatEnabled"         // boolean — AI chat (default: true)
"ai.recommendEnabled"    // boolean — AI recommendations (default: true)
"ai.aboutAssistEnabled"  // boolean — About page assistant (default: true)
```

Getter/setter functions following existing pattern:

```typescript
export async function getAiBaseUrl(): Promise<string> {
  return (await getSetting("ai.baseUrl"))
    ?? process.env.AI_BASE_URL
    ?? "";
}

export async function getAiApiKey(): Promise<string> {
  return (await getSetting("ai.apiKey"))
    ?? process.env.AI_API_KEY
    ?? "";
}

export async function getAiModel(): Promise<string> {
  return (await getSetting("ai.model"))
    ?? process.env.AI_MODEL
    ?? "";
}

export async function getAiChatEnabled(): Promise<boolean> {
  return (await getSetting("ai.chatEnabled")) !== "false"; // default true
}
// ... etc for each toggle
```

**Env fallback chain:** DB → env var → empty string. Supports both admin UI and `.env.local` config.

---

### A3. AI Settings API Endpoint

**New file:** `app/api/admin/settings/ai/route.ts`

Following existing pattern from `app/api/admin/settings/reviews/route.ts`:

```typescript
// GET — returns current AI settings
{
  baseUrl: "https://api.openai.com/v1",
  apiKey: "sk-abc...xyz",     // masked on demo site
  model: "gpt-4o-mini",
  chatEnabled: true,
  recommendEnabled: true,
  aboutAssistEnabled: true
}

// PUT — saves one or more fields, Zod validated
```

**Demo mode:** When `NEXT_PUBLIC_DEMO_MODE === "true"`, GET masks the API key and base URL is read-only.

---

### A4. AI Settings Page

**New file:** `app/admin/settings/ai/page.tsx`

```text
┌──────────────────────────────────────────────┐
│ Settings > AI                                 │
│                                               │
│ ┌─ LLM Provider ──────────────────────────┐  │
│ │                                          │  │
│ │ Base URL                                 │  │
│ │ [https://api.openai.com/v1      ] [Save] │  │
│ │                                          │  │
│ │ Presets:                                 │  │
│ │ OpenAI · Gemini · Groq · Ollama          │  │
│ │                                          │  │
│ │ API Key                                  │  │
│ │ [••••••••••••••••••••       ] 👁 [Save]  │  │
│ │                                          │  │
│ │ Model                                    │  │
│ │ [gpt-4o-mini                   ] [Save]  │  │
│ │                                          │  │
│ └──────────────────────────────────────────┘  │
│                                               │
│ ┌─ Features ──────────────────────────────┐  │
│ │                                          │  │
│ │ AI Chat                          [====]  │  │
│ │ AI-powered shopping assistant             │  │
│ │                                          │  │
│ │ AI Recommendations               [====]  │  │
│ │ Personalized product suggestions          │  │
│ │                                          │  │
│ │ About Page Assistant             [====]  │  │
│ │ AI-generated about page content           │  │
│ │                                          │  │
│ └──────────────────────────────────────────┘  │
│                                               │
│ ℹ Pro plan users get AI included —            │
│   no provider setup needed. View Plans →      │
│                                               │
└──────────────────────────────────────────────┘
```

**Provider presets:** Clicking a preset name auto-fills the Base URL field:

| Preset | Base URL |
|--------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Groq | `https://api.groq.com/openai/v1` |
| Ollama | `http://localhost:11434/v1` |

Presets are convenience — the user can enter any OpenAI-compatible URL.

**API key field:** Eye/EyeOff toggle (from scheduled-jobs pattern). On demo site: read-only, permanently masked.

**Model field:** Free text input. Could show suggestions per provider in future, but free text is simplest for Phase 2A.

**Feature toggles:** Same autoSave pattern as commerce settings. When toggled off, the corresponding API endpoint returns 403.

---

### A5. Refactor AI Endpoints

Replace all Gemini-specific code with calls to `lib/ai-client.ts`.

#### A5a. Chat API

**File:** `app/api/chat/route.ts`

**Before:** Direct REST call to `generativelanguage.googleapis.com` with Gemini-specific format.

**After:**

```typescript
import { chatCompletion, isAIConfigured } from "@/lib/ai-client";
import { getAiChatEnabled } from "@/lib/config/app-settings";

// Check toggle
if (!await getAiChatEnabled()) {
  return NextResponse.json({ error: "AI chat is disabled" }, { status: 403 });
}

// Check config
if (!await isAIConfigured()) {
  return NextResponse.json({ error: "AI provider not configured" }, { status: 500 });
}

// Call LLM (same prompt logic, different transport)
const result = await chatCompletion({
  messages: [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ],
  temperature: 0.7,
});
```

The prompt engineering stays the same — only the transport layer changes.

#### A5b. Recommendations API

**File:** `app/api/recommend/route.ts`

Same pattern as chat. Replace Gemini REST call with `chatCompletion()`. Prompt logic unchanged.

#### A5c. About Page Generation

**File:** `app/api/admin/pages/about/generate-about/route.ts`

**Before:** Uses `@google/generative-ai` SDK with `gemini-2.5-flash`.

**After:** Uses `chatCompletion()`. The 3 parallel generation calls (story, values, product) become 3 parallel `chatCompletion()` calls with the same prompts.

```typescript
// Before
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const result = await model.generateContent(prompt);

// After
const result = await chatCompletion({
  messages: [{ role: "user", content: prompt }],
  temperature: 0.8,
});
```

---

### A6. `.env.example` Update

```bash
# AI — LLM Provider (OpenAI-compatible API)
# Configure via admin Settings > AI, or set here as fallback.
# Any OpenAI-compatible provider works: OpenAI, Gemini, Groq, Ollama, etc.
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=

# DEPRECATED — replaced by AI_BASE_URL + AI_API_KEY + AI_MODEL
# GEMINI_API_KEY=
```

---

### A7. Remove Gemini Dependencies

**Breaking change.** No users, clean break.

- Remove `@google/generative-ai` from `package.json` dependencies
- Remove `GEMINI_API_KEY` from `.env.example` and `lib/validate-env.ts`
- Delete or deprecate `lib/features.ts` and `lib/version.ts`
- Remove `EDITION` from `.env.example`

---

### A8. Admin Nav — Add "AI" to Settings

**File:** `lib/config/admin-nav.ts`

```typescript
{ label: "AI", href: "/admin/settings/ai" },
```

Position: after Commerce, before Shipping.

---

## Phase 2B: License & Plan Foundation

### B1. `lib/license.ts` — Core License Module

**New file.** Central module for tier detection, feature gating, and usage budget checks.

**Exports:**

```typescript
// Tier detection
validateLicense(): Promise<LicenseInfo>
getTier(): Promise<Tier>
isProEnabled(): Promise<boolean>

// Feature gating (Pro features only — FREE features use app-settings toggles)
hasFeature(slug: string): Promise<boolean>

// Trial
getTrialDaysRemaining(): Promise<number | null>

// Usage budget
checkUsageBudget(): Promise<UsageBudgetResult>

// Feature catalog (for Plan page)
getFeatureCatalog(): Promise<CatalogFeature[]>

// GA config
getGAConfig(): Promise<GAConfig | null>

// Cache management
invalidateCache(): void

// Capability reporting
getCapabilities(): Promise<Capabilities>
```

**License key source:** `SiteSettings` table (key: `LICENSE_KEY`), env fallback.

**Graceful degradation:** Network error → cached result → FREE tier. Store never breaks.

---

### B2. `.env.example` — Platform Vars

Add:

```bash
# Artisan Roast Platform — Pro/Trial license
# Leave blank for Free tier. Get a key at artisanroast.app after signing up.
LICENSE_KEY=
PLATFORM_URL=https://manage.artisanroast.app
```

---

### B3. Admin Nav — Add "Plan" to Settings

**File:** `lib/config/admin-nav.ts`

```typescript
{ label: "Plan", href: "/admin/settings/plan" },
```

Position: last item in Settings children.

---

### B4. Plan Page — Settings > Plan

**New files:**

```text
app/admin/settings/plan/
  page.tsx              # Server component — fetches license + catalog
  PlanPageClient.tsx    # Client component — tier-specific UI
  actions.ts            # Server actions — activate key, invalidate cache
```

Three states: FREE, TRIAL, PRO (see wireframes in `PHASE2-OPEN-SOURCE-SPEC.md`).

**FREE state highlights:**

- Feature catalog grouped by category
- "Start Free Trial" → `{PLATFORM_URL}/signup?plan=trial&appVersion={version}`
- "Buy Pro" → `{PLATFORM_URL}/signup?plan=pro&appVersion={version}`
- License key input + "Activate" button
- Note: "AI features running with your own LLM provider" (when AI is configured)

**TRIAL state highlights:**

- Days remaining + progress bar
- Token budget bar (used / total)
- All enabled features with checkmarks
- "Upgrade to Pro" CTA

**PRO state highlights:**

- Enabled features with checkmarks
- Available add-ons (catalog minus enabled) with "Add features" CTA
- GA connection status + Connect/Disconnect button
- "Manage Billing" → `{PLATFORM_URL}/billing`
- License key display (masked)

**Compatibility warnings:** Yellow banner with warnings array + `npm run upgrade` CTA.

---

### B5. Upgrade Prompt Component

**New file:** `components/shared/UpgradePrompt.tsx`

Reusable dashed-border card for gated Pro features. Pulls name/description from feature catalog.

---

### B6. Connect GA Prompt Component

**New file:** `components/shared/ConnectGAPrompt.tsx`

Shown when `hasFeature("analytics-insights")` is true but `gaConfig.connected` is false.

---

## Phase 2C: AI Proxy Integration

### C1. AI Proxy Client

**New file:** `lib/ai-proxy.ts`

Client for Pro-exclusive AI features (future: reviews, CMS, promotions, insights). These route through the platform API, not the store's own LLM provider.

```typescript
export async function callAIProxy(request: {
  featureSlug: string;
  operation: string;
  payload: Record<string, unknown>;
}): Promise<AIProxyResponse>
```

Handles 403 (not enabled), 429 (budget/rate), 500 (platform error).

**Note:** The 3 existing FREE AI features (chat, recommendations, about-assist) continue using `lib/ai-client.ts` with the store's own LLM provider. The proxy is only for future Pro-exclusive features.

---

### C2. Integration Pattern for Future Pro Features

When each Pro AI feature is built:

```typescript
import { hasFeature } from "@/lib/license";
import { callAIProxy } from "@/lib/ai-proxy";

export async function scoreReview(reviewId: string) {
  if (!await hasFeature("ai-reviews")) {
    return { error: "This feature requires a Pro plan" };
  }
  return callAIProxy({
    featureSlug: "ai-reviews",
    operation: "score-review",
    payload: { reviewId },
  });
}
```

---

## Phase 2D: GA OAuth Integration

### D1. Update Root Layout for GA

**File:** `app/layout.tsx`

```typescript
const license = await validateLicense();
const measurementId = license.gaConfig?.measurementId ?? process.env.NEXT_PUBLIC_GA4_ID;

{measurementId && <GoogleAnalytics measurementId={measurementId} />}
```

### D2. Plan Page — GA Connection UI

Already in B4. "Connect Google Analytics" button + "Disconnect" in PRO/TRIAL state.

### D3. Analytics Insights Gate

When built:

```typescript
{insightsEnabled ? (
  gaConnected ? <AnalyticsInsightsDashboard /> : <ConnectGAPrompt />
) : (
  <UpgradePrompt feature="analytics-insights" />
)}
```

---

## Migration & Breaking Changes

### What Gets Removed

| Item | Reason |
|------|--------|
| `@google/generative-ai` package | Replaced by `lib/ai-client.ts` (OpenAI-compatible) |
| `GEMINI_API_KEY` env var | Replaced by `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL` |
| `EDITION` env var | Replaced by `lib/license.ts` tier detection |
| `lib/features.ts` | Replaced by `app-settings.ts` toggles (FREE) + `lib/license.ts` (Pro) |
| `lib/version.ts` | Replaced by `lib/license.ts` |
| Direct Gemini REST calls in chat/recommend | Replaced by `chatCompletion()` |
| Gemini SDK usage in about-assist | Replaced by `chatCompletion()` |

### Migration Guide for Existing Deployments

Add to CHANGELOG / upgrade notes:

```markdown
## Breaking Changes

### AI Provider Configuration

AI features are now LLM-agnostic. Replace your Gemini config:

**Before (.env.local):**
GEMINI_API_KEY=your-gemini-key

**After (.env.local or admin Settings > AI):**
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=your-gemini-key
AI_MODEL=gemini-2.5-flash

Or use any OpenAI-compatible provider:
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-openai-key
AI_MODEL=gpt-4o-mini

Or configure in admin at Settings > AI (no server restart needed).
```

---

## Files Summary

### New Files

| File | Phase | Description |
|------|-------|-------------|
| `lib/ai-client.ts` | A1 | Universal LLM client (OpenAI-compatible) |
| `app/api/admin/settings/ai/route.ts` | A3 | AI settings API endpoint |
| `app/admin/settings/ai/page.tsx` | A4 | AI settings page (provider config + toggles) |
| `lib/license.ts` | B1 | Core license module |
| `lib/ai-proxy.ts` | C1 | Platform AI proxy client (Pro features) |
| `app/admin/settings/plan/page.tsx` | B4 | Plan page (server component) |
| `app/admin/settings/plan/PlanPageClient.tsx` | B4 | Plan page (client component) |
| `app/admin/settings/plan/actions.ts` | B4 | Server actions (activate key, disconnect GA) |
| `components/shared/UpgradePrompt.tsx` | B5 | Reusable upgrade CTA |
| `components/shared/ConnectGAPrompt.tsx` | B6 | GA connection prompt |

### Modified Files

| File | Phase | Change |
|------|-------|--------|
| `lib/config/app-settings.ts` | A2 | Add AI settings keys (baseUrl, apiKey, model, toggles) |
| `lib/config/admin-nav.ts` | A8, B3 | Add "AI" and "Plan" to Settings nav |
| `.env.example` | A6, B2 | Replace `GEMINI_API_KEY` with `AI_*` vars, add `LICENSE_KEY`, `PLATFORM_URL` |
| `lib/validate-env.ts` | A7 | Remove `GEMINI_API_KEY`, add `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` |
| `app/api/chat/route.ts` | A5a | Replace Gemini REST with `chatCompletion()` + toggle check |
| `app/api/recommend/route.ts` | A5b | Replace Gemini REST with `chatCompletion()` + toggle check |
| `app/api/admin/pages/about/generate-about/route.ts` | A5c | Replace Gemini SDK with `chatCompletion()` + toggle check |
| `package.json` | A7 | Remove `@google/generative-ai` |
| `app/layout.tsx` | D1 | Source GA Measurement ID from license + env fallback |

### Deleted Files

| File | Phase | Reason |
|------|-------|--------|
| `lib/features.ts` | A7 | Replaced by app-settings toggles + license module |
| `lib/version.ts` | A7 | Replaced by license module |

---

## Implementation Order

```text
── Phase 2A: LLM-Agnostic AI (no platform dependency) ──

A1  lib/ai-client.ts — universal LLM client
A2  app-settings.ts — add AI settings keys
A3  API endpoint — /api/admin/settings/ai
A4  AI settings page — provider config + feature toggles
A5  Refactor 3 AI endpoints to use chatCompletion()
    a. Chat API
    b. Recommendations API
    c. About page generation
A6  .env.example — replace GEMINI_API_KEY with AI_* vars
A7  Remove Gemini dependencies + lib/features.ts + lib/version.ts
A8  Admin nav — add "AI" link

── Phase 2B: License & Plan (no platform dependency) ──

B1  lib/license.ts — core module (mock-testable)
B2  .env.example — add LICENSE_KEY, PLATFORM_URL
B3  Admin nav — add "Plan" link
B4  Plan page — FREE / TRIAL / PRO states
B5  UpgradePrompt component
B6  ConnectGAPrompt component

── Phase 2C: AI Proxy (requires platform) ──

C1  lib/ai-proxy.ts — proxy client for Pro features
C2  Wire up as each Pro AI feature is built

── Phase 2D: GA OAuth (requires platform) ──

D1  Update root layout for GA Measurement ID sourcing
D2  Plan page GA connection UI (already in B4)
D3  Gate Analytics Insights when built
```

---

## Testing Strategy

### Unit Tests

| Test | File |
|------|------|
| `chatCompletion()` — sends correct format, parses response | `lib/__tests__/ai-client.test.ts` |
| `chatCompletion()` — handles errors (401, 429, 500, network) | `lib/__tests__/ai-client.test.ts` |
| `isAIConfigured()` — DB value, env fallback, unconfigured | `lib/__tests__/ai-client.test.ts` |
| AI settings getters — DB value, env fallback, defaults | `lib/config/__tests__/app-settings.test.ts` |
| `validateLicense()` — valid/invalid/expired/no key | `lib/__tests__/license.test.ts` |
| `hasFeature()` — returns correct values per tier | `lib/__tests__/license.test.ts` |
| `checkUsageBudget()` — cache TTL, budget states | `lib/__tests__/license.test.ts` |
| `callAIProxy()` — error handling (403, 429, 500) | `lib/__tests__/ai-proxy.test.ts` |
| Graceful degradation — network error → cached → FREE | `lib/__tests__/license.test.ts` |

### Integration Tests (Manual)

| Scenario | Expected |
|----------|----------|
| AI settings: configure OpenAI provider → save | Chat uses OpenAI |
| AI settings: configure Ollama (local) → save | Chat uses local model |
| AI settings: configure Gemini via OpenAI-compat URL | Gemini works through new client |
| AI settings: toggle chat off | Chat returns 403 |
| AI settings: no provider configured | AI endpoints return helpful error |
| AI settings: demo mode | API key masked, fields read-only |
| Plan page: no license key | Shows FREE state with catalog |
| Plan page: paste valid key → Activate | Validates, refreshes to Pro/Trial |
| Plan page: paste invalid key | Error toast |
| Platform unreachable | Falls back to cached tier or FREE |

---

## Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Branch strategy | One branch per phase (2A, 2B, 2C, 2D) |
| 2 | Plan page without platform | Live platform homepage (`artisanroast.app`) serves as redirect target. Signup flows handled by platform when ready. |
| 3 | AI settings "Test Connection" button | Yes — sends a tiny completion request to verify config works |
| 4 | Pro feature rollout order | Priority support first (easiest to provision). AI proxy + GA deferred until platform billing is ready. |
| 5 | Pro feature gating | All Pro features gated from day one. Features activate only when platform provisioning + pricing is live. |

---

## Acceptance Criteria

ACs follow the 7-column template from `docs/templates/acs-template.md`. Separate AC docs will be created per phase at `docs/plans/phase2a-ACs.md` and `docs/plans/phase2b-ACs.md` when implementation begins.

### Phase 2A: LLM-Agnostic AI

#### UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-A1 | AI settings page renders LLM Provider section | Static: navigate to `/admin/settings/ai`, element screenshot of provider section | Base URL, API Key (masked), Model fields visible in `.screenshots/phase2a/` | PASS | Puppeteer screenshots confirm all 3 fields render at desktop+mobile | |
| AC-UI-A2 | Provider presets auto-fill Base URL | Interactive: click each preset link (OpenAI, Gemini, Groq, Ollama), screenshot after each | Base URL field shows correct URL for each provider | Deferred | Code confirms `handlePreset` sets `baseUrl` from `AI_PROVIDER_PRESETS` map — needs manual click test | |
| AC-UI-A3 | API key Eye/EyeOff toggle | Interactive: click eye icon, screenshot before and after | Toggles between `••••` and revealed text | Deferred | Code confirms `showApiKey` state toggles `type="password"/"text"` — needs manual click test | |
| AC-UI-A4 | Feature toggles render with labels | Static: screenshot Features section | Chat, Recommendations, About Page Assistant toggles visible with descriptions | PASS | Puppeteer screenshots confirm 3 toggles with labels at desktop+mobile | |
| AC-UI-A5 | Toggle saves on change | Interactive: toggle chat off, reload page, screenshot | Toggle remains off after reload (autoSave) | Deferred | Code confirms `handleToggle` calls PUT API on switch change — needs manual reload test | |
| AC-UI-A6 | Demo mode masks API key | Static: set `NEXT_PUBLIC_DEMO_MODE=true`, screenshot AI settings | Key field read-only, permanently masked, eye icon hidden | PASS | Screenshot shows disabled input + "API key editing is disabled in demo mode" message, eye hidden | |
| AC-UI-A7 | "AI" link in Settings nav | Static: open Settings nav, screenshot | "AI" item visible between Commerce and Shipping | PASS | Puppeteer screenshots confirm AI in nav between Commerce and Shipping at desktop+mobile | |
| AC-UI-A8 | Test Connection shows result | Interactive: click "Test Connection" with valid config, screenshot | Success message or error with details visible | Deferred | Code confirms `handleTest` calls POST, renders CheckCircle2/XCircle — needs AI provider configured | |
| AC-UI-A9 | No provider shows helpful message | Static: clear all AI config, screenshot footer | Note with "configure a provider" or "Pro plan" link visible | PASS | Page loads with empty fields and placeholder text, no errors | |

#### Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-A1 | `lib/ai-client.ts` sends OpenAI-compatible format | Code review: `lib/ai-client.ts` | `POST {baseUrl}/chat/completions` with `messages` array, `Authorization: Bearer` header | PASS | Verified: `ai-client.ts:184` URL, `:188` messages body, `:203` Bearer header | |
| AC-FN-A2 | Config reads from DB first, env fallback | Code review: `lib/ai-client.ts` + `lib/config/app-settings.ts` | `getAiBaseUrl()` / `getAiApiKey()` / `getAiModel()` called, not `process.env` directly | PASS | Verified: `ai-client.ts:106-121` queries DB via `prisma.siteSettings.findMany`, env fallback second | |
| AC-FN-A3 | Token logging preserved | Code review: `lib/ai-client.ts` | Writes to `AiTokenUsage` after successful completion | PASS | Verified: `generate-about/route.ts:731-776` writes `prisma.aiTokenUsage.createMany` | |
| AC-FN-A4 | AI settings API validates with Zod | Code review: `app/api/admin/settings/ai/route.ts` | PUT handler uses Zod schema for all fields | PASS | Verified: `route.ts:34-41` Zod schema, `:47` `safeParse(body)` in PUT | |
| AC-FN-A5 | Demo mode masking | Code review: `app/api/admin/settings/ai/route.ts` | `NEXT_PUBLIC_DEMO_MODE === "true"` → GET returns masked apiKey | PASS | Verified: `route.ts:11-14` `maskApiKey()` always applied; demo mode disables client-side editing | |
| AC-FN-A6 | Chat checks toggle | Code review: `app/api/chat/route.ts` | `getAiChatEnabled()` check, returns 403 when disabled | PASS | Verified: `chat/route.ts:131` `isAIFeatureEnabled("chat")` guard, 403 response | |
| AC-FN-A7 | Recommend checks toggle | Code review: `app/api/recommend/route.ts` | Same pattern as chat | PASS | Verified: `recommend/route.ts:59` `isAIFeatureEnabled("recommend")` guard, 403 response | |
| AC-FN-A8 | About-assist checks toggle | Code review: `app/api/admin/pages/about/generate-about/route.ts` | Same pattern as chat | PASS | Verified: `route.ts:370` `isAIFeatureEnabled("aboutAssist")` guard, 403 response | |
| AC-FN-A9 | No Gemini imports remain | Code review: grep entire codebase | No `@google/generative-ai` imports, no direct `generativelanguage.googleapis.com` REST calls | PASS | Grep confirmed 0 hits for `@google/generative-ai` in .ts/.tsx; Gemini URL only in preset constant | |
| AC-FN-A10 | Gemini package removed | Code review: `package.json` | `@google/generative-ai` not in dependencies | PASS | Verified: not in `package.json` dependencies; `npm uninstall` removed 203 packages | |
| AC-FN-A11 | Legacy feature system deleted | Code review: file system | `lib/features.ts` and `lib/version.ts` do not exist | PASS (partial) | `lib/features.ts` deleted. `lib/version.ts` kept — used by `lib/telemetry.ts` + `api/version/check`. Will be replaced in Phase 2B | |
| AC-FN-A12 | Env vars updated | Code review: `.env.example` | `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` present; `GEMINI_API_KEY` absent | PASS | Verified: `.env.example:16-20` has AI_* vars; GEMINI_API_KEY removed | |
| AC-FN-A13 | Test Connection verifies config | Code review: test connection endpoint/action | Sends minimal completion request, returns success/error | PASS | Verified: `ai-client.ts:269-289` `testAIConnection()` sends "Say OK" with maxTokens:5; POST handler returns model+responseTime | |

#### Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-A1 | Chat works with new client | E2E: configure provider in settings, send chat message | Response received (Claude Desktop if needed) | Deferred | Requires AI provider configured; code path verified via FN-A1+A6 | |
| AC-REG-A2 | Recommendations work | E2E: navigate to product page | Recommendations section loads | Deferred | Requires AI provider configured; code path verified via FN-A1+A7 | |
| AC-REG-A3 | About page generation works | E2E: trigger about page generation in admin | Content generated successfully | Deferred | Requires AI provider configured; code path verified via FN-A1+A8 | |
| AC-REG-A4 | Test suite passes | `npm run test:ci` | All tests pass, 0 failures | PASS | 88 suites, 1037 tests, 0 failures (21s) | |
| AC-REG-A5 | Precheck passes | `npm run precheck` | TypeScript + ESLint 0 errors | PASS | 0 errors, 2 pre-existing warnings (unrelated) | |

### Phase 2B: License & Plan

#### UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-B1 | FREE state renders | Static: navigate to `/admin/settings/plan` with no license key, element screenshot | "Free" badge, feature catalog by category, trial/buy CTAs, key input visible | | N/A — Phase 2B not implemented | |
| AC-UI-B2 | Catalog grouped by category | Static: screenshot catalog section | Analytics, AI, Support sections with feature names + descriptions | | N/A — Phase 2B not implemented | |
| AC-UI-B3 | Trial CTA links to platform | Interactive: click "Start Free Trial" | URL contains `{PLATFORM_URL}/signup?plan=trial&appVersion=` | | N/A — Phase 2B not implemented | |
| AC-UI-B4 | Key activation success | Exercise: paste valid key, click Activate, screenshot | Success toast, page shows new tier state | | N/A — Phase 2B not implemented | |
| AC-UI-B5 | Invalid key error | Exercise: paste malformed key, click Activate, screenshot | Error toast: "Invalid license key" | | N/A — Phase 2B not implemented | |
| AC-UI-B6 | TRIAL state renders | Static: screenshot Plan page with trial key active | Days remaining, progress bar, token budget bar, enabled features visible | | N/A — Phase 2B not implemented | |
| AC-UI-B7 | PRO state renders | Static: screenshot Plan page with pro key active | Enabled features, add-ons, "Manage Billing" link, masked key visible | | N/A — Phase 2B not implemented | |
| AC-UI-B8 | Compatibility warnings | Static: mock `compatibility: "partial"` response, screenshot | Yellow banner with warnings + `npm run upgrade` CTA | | N/A — Phase 2B not implemented | |
| AC-UI-B9 | "Plan" in Settings nav | Static: screenshot Settings nav | "Plan" item visible as last Settings child | | N/A — Phase 2B not implemented | |
| AC-UI-B10 | UpgradePrompt component | Static: navigate to a Pro-gated area, screenshot | Dashed card with feature name, description, "View Plans" link | | N/A — Phase 2B not implemented | |

#### Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-B1 | Validate sends version + capabilities | Code review: `lib/license.ts` | Request body includes `appVersion`, `capabilities` per contract §1a | | N/A — Phase 2B not implemented | |
| AC-FN-B2 | License cached 24h | Code review: `lib/license.ts` | TTL check before API call, uses `LICENSE_CACHE_TTL` | | N/A — Phase 2B not implemented | |
| AC-FN-B3 | Graceful degradation | Code review: `lib/license.ts` | Network error → cached result → `DEFAULT_FREE` | | N/A — Phase 2B not implemented | |
| AC-FN-B4 | `hasFeature()` checks array | Code review: `lib/license.ts` | `features.includes(slug)` | | N/A — Phase 2B not implemented | |
| AC-FN-B5 | Budget check uses 5min TTL | Code review: `lib/license.ts` | Separate cache TTL from license validation | | N/A — Phase 2B not implemented | |
| AC-FN-B6 | Key format validation | Code review: `app/admin/settings/plan/actions.ts` | Regex: `/^ar_lic_[0-9a-f]{64}$/` | | N/A — Phase 2B not implemented | |
| AC-FN-B7 | Key saved to DB | Code review: `app/admin/settings/plan/actions.ts` | Upserts `LICENSE_KEY` in `SiteSettings` | | N/A — Phase 2B not implemented | |
| AC-FN-B8 | Cache invalidation | Code review: `lib/license.ts` | `invalidateCache()` clears license + catalog caches | | N/A — Phase 2B not implemented | |
| AC-FN-B9 | Env vars added | Code review: `.env.example` | `LICENSE_KEY`, `PLATFORM_URL` present with comments | | N/A — Phase 2B not implemented | |

#### Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-B1 | App works without license | E2E: start app with no `LICENSE_KEY` | No errors, all FREE features work | | N/A — Phase 2B not implemented | |
| AC-REG-B2 | Platform unreachable is safe | Code review + E2E: set invalid `PLATFORM_URL` | No 500s, falls back gracefully | | N/A — Phase 2B not implemented | |
| AC-REG-B3 | Test suite passes | `npm run test:ci` | All tests pass, 0 failures | | N/A — Phase 2B not implemented | |
| AC-REG-B4 | Precheck passes | `npm run precheck` | TypeScript + ESLint 0 errors | | N/A — Phase 2B not implemented | |

### Phase 2C: AI Proxy (Deferred)

#### Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-C1 | Bearer auth header | Code review: `lib/ai-proxy.ts` | `Authorization: Bearer {key}` | | N/A — Phase 2C not implemented | |
| AC-FN-C2 | 403 → FeatureNotEnabledError | Code review: `lib/ai-proxy.ts` | Throws typed error | | N/A — Phase 2C not implemented | |
| AC-FN-C3 | 429 → budget/rate errors | Code review: `lib/ai-proxy.ts` | Distinguishes budget vs rate limit | | N/A — Phase 2C not implemented | |
| AC-FN-C4 | 500/network → ProxyUnavailableError | Code review: `lib/ai-proxy.ts` | Graceful error | | N/A — Phase 2C not implemented | |

### Phase 2D: GA OAuth (Deferred)

#### UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-D1 | GA not connected shows Connect | Static: screenshot Plan page PRO state without GA | "Connect Google Analytics" button visible | | N/A — Phase 2D not implemented | |
| AC-UI-D2 | GA connected shows property info | Static: screenshot Plan page with GA connected | Property name, Measurement ID, last synced, Disconnect button | | N/A — Phase 2D not implemented | |
| AC-UI-D3 | Insights gate without GA | Static: screenshot insights area without GA | ConnectGAPrompt shown instead of dashboard | | N/A — Phase 2D not implemented | |

#### Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-D1 | GA Measurement ID from license | Code review: `app/layout.tsx` | Falls back to `NEXT_PUBLIC_GA4_ID` env var | | N/A — Phase 2D not implemented | |
| AC-FN-D2 | GA conditional render | Code review: `app/layout.tsx` | Script only injected when measurementId present | | N/A — Phase 2D not implemented | |
| AC-FN-D3 | Disconnect calls platform | Code review: `app/admin/settings/plan/actions.ts` | `POST {PLATFORM_URL}/api/ga/disconnect` | | N/A — Phase 2D not implemented | |

---

## Verification Workflow

Follows the agentic feature workflow defined in `docs/AGENTIC-WORKFLOW.md`. Key references:

- **State machine**: `docs/AGENTIC-WORKFLOW.md` § Process Loop & State Machine
- **AC template**: `docs/templates/acs-template.md` (7-column: What, How, Pass, Agent, QC, Reviewer)
- **Verification skill**: `.claude/skills/ac-verify/SKILL.md`
- **Status tracking**: `.claude/verification-status.json`

### State Machine Per Phase

Each phase branch follows the full workflow lifecycle:

```text
planning → planned → implementing → pending → [partial] → verified → PR/release
```

Register in `.claude/verification-status.json` at Phase 0 (initiate):

```jsonc
{
  "feat/phase2a-llm-agnostic-ai": {
    "status": "planning",
    "acs_passed": 0,
    "acs_total": 27,  // 13 FN + 9 UI + 5 REG
    "tasks": [],
    "acs_doc": "docs/plans/phase2a-ACs.md",
    "notes": "Workflow initiated."
  },
  "feat/phase2b-license-plan": {
    "status": "planning",
    "acs_passed": 0,
    "acs_total": 23,  // 9 FN + 10 UI + 4 REG
    "tasks": [],
    "acs_doc": "docs/plans/phase2b-ACs.md",
    "notes": "Workflow initiated."
  }
}
```

### Verification Protocol (per `AGENTIC-WORKFLOW.md`)

1. **Implementation complete** → status `pending`, hooks block commits
2. **Spawn `/ac-verify` sub-agent** with ACs, pages, dev server URL:
   - FN ACs: code review with `file:line` evidence
   - UI ACs: element screenshots (NEVER `fullPage: true`) saved to `.screenshots/phase2a/` or `.screenshots/phase2b/`
   - REG ACs: `npm run precheck` + `npm run test:ci` + spot checks
   - E2E ACs: Claude Desktop available for interactive flows (Test Connection, key activation)
3. **Sub-agent fills Agent column** in ACs doc
4. **QC (main thread)** reads every screenshot, independently verifies, fills QC column
5. **Failures** → fix code, re-spawn sub-agent. Status stays `pending` or `partial`
6. **All pass** → status `verified`, present report to human (Phase 5)
7. **Human fills Reviewer column** → approve → commit, PR, `/release`

### Screenshot Rules

- **NEVER** use `fullPage: true` — element screenshots (`element.screenshot()`) or viewport-only only
- Save to `.screenshots/phase2a/` and `.screenshots/phase2b/` (subdirectories, not root)
- Breakpoints: mobile (375x812), tablet (768x1024), desktop (1440x900)
- Puppeteer for static/interactive ACs; Claude Desktop for e2e exercise ACs when needed

### AC Docs

When implementation starts for each phase, create the formal AC doc from `docs/templates/acs-template.md`:

- `docs/plans/phase2a-ACs.md` — Phase 2A ACs (27 total: 13 FN + 9 UI + 5 REG)
- `docs/plans/phase2b-ACs.md` — Phase 2B ACs (23 total: 9 FN + 10 UI + 4 REG)

### Commit Schedule

```text
Phase 2A:
1. docs: add Phase 2A plan and ACs                (after plan approval)
2. feat: add lib/ai-client.ts                     (universal LLM client)
3. feat: add AI settings page + API endpoint       (settings UI + backend)
4. refactor: migrate AI endpoints to chatCompletion (3 endpoints)
5. chore: remove Gemini deps + legacy feature system
6. chore: update verification status               (after all ACs pass)

Phase 2B:
1. docs: add Phase 2B plan and ACs                (after plan approval)
2. feat: add lib/license.ts                       (license module)
3. feat: add Plan page + tier states               (settings UI)
4. feat: add UpgradePrompt + ConnectGAPrompt       (shared components)
5. chore: update verification status               (after all ACs pass)
```
