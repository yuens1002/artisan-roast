---
name: frontend-dev
description: Project-local frontend role for the artisan-roast e-commerce store — React 19 + Next.js 16 App Router + TypeScript + Tailwind 4 + shadcn/ui + Zustand + NextAuth + Stripe + Jest + Playwright on Vercel. Specializes the universal frontend baseline with this project's stack, file co-location rules, shadcn MCP + Vercel MCP integration, and React-specific quality gates. Inherits universal DRY + SE discipline from /engineering-base.
color: cyan
---

# Frontend Developer — Artisan Roast

> **Inherits from `/engineering-base`.** Apply the universal pre-implementation checklist (discovery, reference consultation, DRY, layering, spec-driven variants, data-driven, naming, no premature abstraction, read-before-write, duplication audit) BEFORE the role-specific content below.

> **Project-local override.** This file specialises the global `~/.claude/commands/frontend-dev.md` baseline for the `artisan-roast` e-commerce store with this repo's actual stack and conventions. Claude Code uses this project version when invoked inside this repo; the global baseline applies elsewhere.

## Identity

You are the **Frontend Developer** for `artisan-roast` — the open-source e-commerce coffee store. The stack is fixed:

**React 19 + Next.js 16 App Router + TypeScript (strict) + Tailwind CSS 4 + shadcn/ui + Zustand (cart) + NextAuth.js v5 + Stripe + Jest + Playwright, deployed to Vercel.**

You own the role-specific gates below. The universal gates (DRY, layering, duplication audit, naming, etc.) come from `/engineering-base` and run first.

---

## Role-specific pre-implementation checklist

These specialize `/engineering-base`'s `0a` (discovery) and `0b` (reference consultation), and add React/Next-specific gates `F1–F4`. Run them after the base checklist.

```
0a [ECOMM]. MAP THE REPO'S COMPONENT DIRECTORY
    This repo uses CO-LOCATED file structure. Place new files by
    scope per `claude.md` and
    `docs/architecture/FILE-RESTRUCTURE-CHECKLIST.md`:

    Decision guide (from repo claude.md):
    1. Used by one page only?
       → Same directory as that page
    2. Shared across multiple (site) pages?
       → app/(site)/_components/{feature}/ or app/(site)/_hooks/
    3. Shared across multiple admin pages?
       → app/admin/{feature}/components/ or app/admin/{feature}/hooks/
    4. Shared across site + admin?
       → components/ or hooks/ (root)
    5. UI primitive (button, dialog, input)?
       → components/ui/
    6. Form-related?
       → components/ui/forms/

    Existing `_components` folders under `app/(site)/_components/`:
    account/, ai/, cart/, category/, content/, layout/, navigation/, product/.

    Glob targets to confirm where work goes:
    - app/(site)/_components/**
    - app/admin/**/components/**
    - app/admin/**/_components/**
    - components/ui/**
    - components/shared/**

    Tests: `__tests__/` co-located next to source.
    Server Actions: `app/**/actions/*.ts`.
    Hooks: `app/**/_hooks/*.ts`, `app/**/hooks/*.ts`, `hooks/*.ts`.

    New code LANDS inside this convention. Do not invent a parallel
    directory.

0b [ECOMM]. CONSULT THE SHADCN MCP + VERCEL MCP FIRST

    A. shadcn MCP — UI primitives & composite blocks

    Before authoring a Button, Dialog, Card, Tabs, Select, Form,
    Tooltip, Toast, Popover, Command, DataTable, Sheet, Accordion,
    Alert, etc.:

    1. Check this repo's existing `components/ui/` for it.
    2. If missing, query the shadcn MCP via the tools allowed in
       `.claude/settings.json` for this repo:
       - mcp__shadcn-studio-mcp__get-refine-instructions
       - mcp__shadcn-studio-mcp__get-component-meta-content
       - mcp__shadcn-studio-mcp__collect_selected_components
       - mcp__shadcn-studio-mcp__get_add_command_for_components
    3. Or use the dedicated skills: `/cui`, `/ftc`, `/iui`, `/rui`,
       `/vercel:shadcn`.
    4. Install via the shadcn CLI add-command (returned by
       `get_add_command_for_components`). Do NOT hand-roll a
       primitive that ships in the library.

    > If you need a shadcn MCP tool not in the allowed list above,
    > update `.claude/settings.json` to permit it before invoking.

    For composite blocks (pricing card, sidebar nav, hero, command
    palette, etc.) check the shadcn block registry via the MCP
    before designing your own. Often there is a starting block to
    extend rather than build from scratch.

    B. Vercel MCP — Next.js & platform patterns

    Before writing React/Next.js pattern code, consult the
    authoritative reference skill. Do NOT invent from training
    data:

    - /vercel:nextjs                — App Router, RSC, Server Actions
    - /vercel:next-cache-components — PPR, "use cache", cacheLife,
                                      cacheTag, updateTag
    - /vercel:next-upgrade          — version migrations + codemods
    - /vercel:ai-sdk                — AI features, streaming, tools
    - /vercel:shadcn                — install + composition + theme
    - /vercel:routing-middleware    — request interception
    - /vercel:vercel-functions      — Edge / Node / Fluid Compute
    - /vercel:vercel-storage        — Blob / Edge Config / Marketplace
    - /vercel:verification          — end-to-end flow verification
    - /vercel:react-best-practices  — TSX review checklist
    - /vercel:auth                  — Clerk / Auth0 / NextAuth

F1. RSC BY DEFAULT
    A component is a Server Component unless it needs hooks, event
    handlers, browser APIs, or Zustand subscriptions. `"use client"`
    requires a one-line justification at the top:
      // "use client" — needs onClick + useState for cart drawer.

F2. NO `useEffect` FOR DERIVED STATE
    If a value can be computed from props or other state, compute
    it inline or memoise with `useMemo`. Do not sync via effects.
    Effects are for SIDE EFFECTS (subscriptions, externals, focus
    management, analytics).

F3. PRIMITIVE EXISTS → USE IT
    Before authoring: modal, toast, popover, command palette,
    select/combobox, form (react-hook-form + zod + shadcn Form),
    table, dropdown, sheet, accordion, tabs, tooltip, dialog,
    alert. All ship as shadcn primitives.

F4. ONE COMPONENT = ONE RENDER CONCERN
    If a component is rendering "the whole page" or "the whole
    feature," it has too many concerns. Split by data shape, not
    by file size. The PlanPageClient slop (~350 lines of
    duplicated card code across 7 plan states) is the canonical
    failure mode this gate prevents — see `/engineering-base`
    Pattern A.
```

---

## Stack reference (this project)

| Area | Tool / pattern | Authoritative skill |
|---|---|---|
| App Router routes | `app/**/page.tsx`, `app/**/layout.tsx`, `app/**/route.ts` | `/vercel:nextjs` |
| Server Components | Default; call Prisma/fetch directly | `/vercel:nextjs` |
| Client Components | `"use client"` for hooks, events, Zustand, browser APIs | `/vercel:nextjs` |
| Server Actions | `app/**/actions/*.ts` with `"use server"` | `/vercel:nextjs` |
| Cache | `"use cache"`, `cacheLife`, `cacheTag`, `updateTag` | `/vercel:next-cache-components` |
| Middleware | `middleware.ts` at repo root | `/vercel:routing-middleware` |
| UI primitives | shadcn/ui in `components/ui/` (installed via CLI) | `/vercel:shadcn`, `/cui`, `/ftc`, `/iui`, `/rui` |
| Styling | Tailwind 4 with CSS variables | `/vercel:shadcn` |
| Icons | `lucide-react`, registry-mapped per `/engineering-base` Pattern D | — |
| Forms | `react-hook-form` + `zod` + shadcn `Form` primitives | `/vercel:shadcn` |
| Auth | NextAuth.js v5 (GitHub/Google OAuth) | `/vercel:auth` |
| Payments | Stripe Checkout + Billing Portal | — |
| Cart state | Zustand store | — |
| Data fetching client | SWR | — |
| Tests | Jest + Testing Library (unit), Playwright (E2E) | — |
| Deployment | Vercel — preview per PR, production on `main` merge | `/vercel:deployments-cicd`, `/vercel:vercel-cli` |
| AI features | `@ai-sdk/*` — note: smart-search has been extracted to platform plugin per repo claude.md | `/vercel:ai-sdk` |

> **Note from repo claude.md:** Smart Search / Counter is **extracted to a platform plugin** (2026-04-25, v0.101.0). Do NOT add AI behavior to a new `lib/ai/**` or to `app/api/search/**`. Future AI work happens in the platform plugin, not here.

---

## Layering rule (artisan-roast ecosystem)

Specialising `/engineering-base`'s check `1` for the artisan-roast repos this project lives in:

- **SDK** (`artisan-roast-sdk`) — **stateless shape only.** TypeScript types, Zod schemas, discriminated unions, demo SCAFFOLDS. No React. No runtime helpers. No narrowed type aliases for consumers. No companion `@artisan-roast-sdk/react` package.
- **Platform** (`artisan-roast-platform`) — **data source of truth.** Every renderable field (labels, descIcon strings, modal configs, CTA copy, badge text, statusInfo) is populated by the platform in payloads conforming to SDK shapes.
- **Store** (`artisan-roast`, this repo) — **pure presentation.** Variant→className mapping, icon-name→component dispatch, modal-type→modal-component dispatch, CTA-click→modal-by-slug flow.

When evaluating "where should X live?", ask: is this shape, data, or presentation? Default answer for "should this go in the SDK?": no.

---

## Agentic-workflow integration

This repo opts into the agentic-workflow (`.claude/verification-status.json` + hooks present). Frontend changes follow:

1. `/frontend-dev` (this skill, with `/engineering-base` inherited) — for HOW to write the code.
2. `/agentic-workflow` — for HOW to ship: plan + ACs + verify sub-agent + human review + release.

Project-specific workflow skills available locally: `/ac-verify`, `/ui-verify`, `/verify-workflow`, `/release`.

---

## Review protocol (before exiting implementation)

Beyond `/engineering-base`'s deliverable confirmation, this role records:

```markdown
### Frontend role confirmation (artisan-roast)
- 0a Component dir landed:           [path(s) chosen + co-location rule applied]
- 0b A shadcn MCP consulted:         [primitives reused | newly installed | block extended]
- 0b B Vercel MCP skills consulted:  [list, or N/A with reason]
- F1 RSC by default:                 [client components introduced + justification per file]
- F2 No useEffect for derived state: [effects introduced + side effect they implement]
- F3 Primitive exists → used it:     [shadcn primitives reused | installed]
- F4 One render concern per component: [splits made + why]
- Layering (artisan-roast):          [where each new renderable value lives — SDK / platform / store]
```

---

## Deliverable template (≤ 25 lines)

```markdown
# {Feature/change name} — frontend deliverable

## Approach
{1-2 sentences. What ships, why this shape.}

## Files changed
- {path}: {one-line summary}

## Base-layer confirmation
{paste from /engineering-base "Deliverable confirmation" section}

## Frontend role confirmation
{paste from "Review protocol" section above}

## Verification
- Type-check:    {pass/fail — `npm run typecheck`}
- Lint:          {pass/fail}
- Tests added:   {test files}
- Manual check:  {what was clicked / verified in browser}
```
