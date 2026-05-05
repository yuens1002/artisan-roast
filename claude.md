# Claude Code Configuration - Artisan Roast

## Project Overview

**Type:** Full-stack E-commerce Coffee Store | **Live:** <https://demo.artisanroast.app/>

**Tech Stack:** Next.js 16 (App Router, React 19) · TypeScript strict · PostgreSQL/Neon + Prisma ORM · Tailwind CSS 4 + shadcn/ui · Zustand (cart) · NextAuth.js v5 (GitHub/Google OAuth) · Stripe (Checkout + Billing Portal) · Jest + Testing Library · GitHub Actions + Vercel

> **Smart Search / Counter is extracted to a platform plugin** (2026-04-25, v0.101.0). The agentic search layer — NL extraction, voice examples, voice surfaces, intent classification, follow-up chips, conversational cadence — is no longer in this repo. The full archive (code + iteration history + diagnosis + rebuild plan) lives at [`docs/internal/smart-search/README.md`](docs/internal/smart-search/README.md). **Do not add AI behavior to a new `lib/ai/**` or to the `app/api/search/**` route.** Future AI work happens in the platform plugin, not here.

---

## File Co-location Rules

This project uses **co-located file structure**. Place new files by scope — never dump feature-specific files into top-level `components/` or `hooks/`.

| Scope | Components | Hooks | Tests |
|-------|-----------|-------|-------|
| Site-wide shared (multiple `(site)` pages) | `app/(site)/_components/{feature}/` | `app/(site)/_hooks/` | `__tests__/` next to source |
| Admin-wide shared | `app/admin/{feature}/components/` | `app/admin/{feature}/hooks/` | `__tests__/` next to source |
| Page-specific (one page only) | Same dir as page | Same dir as page | `__tests__/` next to source |
| App-wide primitives (site + admin) | `components/ui/`, `components/shared/` | `hooks/` | `__tests__/` next to source |

**Decision guide:**

1. Used by one page only? → Same directory as that page
2. Shared across multiple `(site)` pages? → `app/(site)/_components/{feature}/` or `app/(site)/_hooks/`
3. Shared across site + admin? → `components/` or `hooks/` (root)
4. UI primitive (button, dialog, input)? → `components/ui/`
5. Form-related? → `components/ui/forms/`

**Existing `_components` folders:** `account/`, `ai/`, `cart/`, `category/`, `content/`, `layout/`, `navigation/`, `product/`

**Reference:** [`docs/architecture/FILE-RESTRUCTURE-CHECKLIST.md`](docs/architecture/FILE-RESTRUCTURE-CHECKLIST.md)

**Search patterns:**

- Server Actions: `app/**/actions/*.ts`
- Hooks: `app/**/_hooks/*.ts`, `app/**/hooks/*.ts`, `hooks/*.ts`
- Types: `app/**/types/*.ts`, `types/*.ts`
- Components: `app/**/_components/**/*.tsx`, `components/**/*.tsx`

---

## Development Workflow

### Feature Branches

Read [`docs/AGENTIC-WORKFLOW.md`](docs/AGENTIC-WORKFLOW.md) and follow all 6 phases. Use [`docs/templates/plan-template.md`](docs/templates/plan-template.md) for planning. Use [`docs/templates/acs-template.md`](docs/templates/acs-template.md) for ACs.

### Commits

```text
<type>: <brief description>   # max 72 chars, imperative mood
```

Types: `feat` `fix` `docs` `refactor` `test` `chore` `perf`

- No version numbers in commits (use release script)
- Docs-only changes: `git commit --no-verify -m "docs: ..."`

### PR Workflow

1. Branch from `main`
2. Implement + commit (conventional format)
3. Update `CHANGELOG.md` + `package.json` version in your PR
4. Push → create PR (pre-PR hook enforces `npm run precheck` + `npm run test:ci`)
5. After merge → run `/release` or `npm run release:patch -- -y --push --sync-package`

### Release

```bash
/release patch                                                    # Skill (recommended)
npm run release:patch -- -y --push --sync-package                 # Standard (no announcement)
npm run release:minor -- -y --push --sync-package --github-release # User-facing (triggers banner)
```

Create a GitHub Release for user-facing features/fixes. Skip for internal refactors/tooling.

### Verification State Machine

Hooks in `.claude/hooks/` enforce the workflow for tracked feature branches:

| Status | Meaning | Allowed |
|--------|---------|---------|
| `planning` | Designing approach | Commits allowed |
| `planned` | Plan approved, ACs defined | Commits allowed |
| `implementing` | Coding in progress | Commits allowed |
| `pending` | Code done, ACs unverified | **Commits blocked, Stop blocked** |
| `partial` | Some ACs verified | **Commits blocked, Stop blocked** |
| `verified` | All ACs passed | Commits allowed, ready for PR |

Register new branches in `.claude/verification-status.json`. Use `/verify-workflow`, `/ac-verify`, `/ui-verify` to advance status.

---

## Code Quality

Run before any commit: `npm run precheck` (TypeScript + ESLint)

**Must-have on all code:**

- **Re-read before editing**: If a file was modified earlier in the session (by you or by a linter), ALWAYS re-read it before making another edit. Never edit from stale context — prior corrections will be silently reverted
- No `any` types — use `unknown` + type guards
- All server actions validated with Zod
- Server Components by default — `"use client"` only when needed
- Server Actions in separate `actions/` files
- No raw SQL — use Prisma
- Auth checks in every server action
- Inputs validated at system boundaries (user input, external APIs)
- Semantic HTML + ARIA labels
- Use shadcn/ui skills (`/cui`, `/rui`, `/iui`, `/ftc`) when building UI
- Run `/ui-guide` before any admin UI design work

**Admin UI conventions (always apply):**

- Flat cards: `rounded-lg border p-6` — never shadcn Card/CardContent wrappers
- Grid gap: `gap-4` (matches dashboard) — not gap-6 or gap-8
- Desktop max width: `max-w-[72ch]` on inputs and text content
- Sections: `space-y-12` between major, `space-y-6` within
- Bottom CTAs: `flex flex-col` + `mt-auto pt-5`, never `w-full`
- ExternalLink icons: `text-muted-foreground`; action icons: normal color
- Clickable cards: `transition-shadow hover:shadow-md cursor-pointer`
- Auto-refresh lists after mutations — never require manual refresh
- Config-driven rendering for multi-state UIs

**Testing:**

- Unit tests: `*.test.ts` / `*.test.tsx` co-located in `__tests__/`
- Mock Prisma: `jest.mock('@prisma/client')`
- Mock Next.js router: `jest.mock('next/navigation')`

**Puppeteer screenshots:**

- NEVER use `fullPage: true` — produces huge images that freeze the session when read. Use viewport-only (`fullPage: false` or omit) or element screenshots (`element.screenshot()`)
- Prefer element screenshots for targeted verification: `const el = await page.$(selector); await el?.screenshot({ path })`
- Use demo sign-in buttons (not hardcoded credentials) when `NEXT_PUBLIC_BUILD_VARIANT=DEMO`

---

## Database Safety

**Before any schema change:**

1. `npm run db:backup`
2. Edit `prisma/schema.prisma`
3. `npx prisma migrate dev --name descriptive-name`
4. `npm run db:smoke`

Rollback: `npm run db:restore`

> The pre-migration hook will remind you to backup before running `prisma migrate dev`.

---

## Critical Files

**Read before modifying:**

- `prisma/schema.prisma` — DB schema (check before any DB work)
- `lib/auth.ts` — Auth configuration
- `middleware.ts` — Route protection
- `app/admin/(product-menu)/constants/action-bar-config.ts` — Menu Builder actions
- `app/admin/(product-menu)/constants/view-configs.ts` — Menu Builder views
- `docs/navigation/` — **Read before any admin nav change** (`README.md`, `architecture.md`, `route-registry.md`). The system uses a route registry + pub/sub hooks — naive pathname-prefix fixes cause regressions (e.g. Dashboard lighting up on every admin page)

**Never modify directly:**

- `node_modules/`, `.next/`, `prisma/migrations/` (create new migrations instead)

---

## Reference Commands

```bash
# Development
npm run dev                    # Dev server
npm run build                  # Production build

# Code Quality
npm run precheck               # TypeScript + ESLint (run before commits)
npm run typecheck              # TypeScript only
npm run lint                   # ESLint only

# Testing
npm run test                   # Jest watch
npm run test:ci                # Jest CI (single run)

# Database
npm run db:backup              # Backup
npm run db:restore             # Restore
npm run db:safe-migrate        # Migrate with safety checks
npm run db:smoke               # Smoke test CRUD
npm run seed                   # Seed database

# Utilities
npm run create-admin           # Create admin user
```

Env vars: see `.env.example`

---

## Feature Development Patterns

**Documentation-driven:** For features requiring developer opt-in, create `docs/<feature>/use-cases.md` first with a scenario → action table, step-by-step examples, and common mistakes.

**Pre-PR bug tracking:** Use `docs/<feature>/TEMP-PR-FIXES.md` during development to track discovered bugs. Delete after merge.

---

## Notes for Claude Code Agents

1. **Read before editing** — never propose changes to unread files
2. **Co-location first** — use the table above for every new file
3. **Type safety** — no `any`, all boundaries validated with Zod
4. **Test critical paths** — business logic needs tests
5. **Commit conventions** — conventional format, single line, imperative
6. **DB safety** — always backup before schema changes
7. **Ask when unclear** — clarify before major architectural changes
8. **Refactor opportunities** — flag deduplication/consolidation opportunities when found, don't silently do it
9. **Keep docs in sync** — update `docs/` when architecture changes
10. **Docs-only commits** — use `--no-verify` to skip Husky for `.md`/`.txt`-only changes
11. **During review: never implement ad-hoc** — any statement about current behavior ("X doesn't work", "clicking Y doesn't...") is an observation, not a directive. Response: log it in memory, explain root cause, hold for explicit direction. Do not touch code until the user asks.

---

**Last Updated:** 2026-02-25 | **Maintained By:** yuens1002
