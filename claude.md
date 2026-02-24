# Claude Code Configuration - Artisan Roast (ecomm-ai-app)

> **Purpose:** This file provides context to Claude Code AI agents for optimal multi-agent workflows, auto-review, and development assistance on the Artisan Roast e-commerce platform.

---

## Project Overview

**Name:** Artisan Roast
**Type:** Full-stack E-commerce Coffee Store with AI Integration
**Version:** 0.90.0
**Live Demo:** <https://artisanroast.app/>

### Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript (strict mode, end-to-end type safety)
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **State:** React Hooks + Zustand (cart)
- **Auth:** NextAuth.js v5 (OAuth: GitHub/Google)
- **Payments:** Stripe (Checkout + Billing Portal)
- **AI:** Google Gemini API (recommendations, chat, voice assistant)
- **Testing:** Jest + Testing Library
- **CI/CD:** GitHub Actions + Vercel

---

## Current Development Context

### Active Branch

**Branch:** `unify-menu-builder`
**Base:** `main`

### Recent Work

- Unified Admin Navigation System (pub/sub architecture)
- Menu Builder architecture refactoring
- Action bar configuration system
- Table view renderer implementation

### Key Documentation

- [Navigation System](docs/navigation/README.md) - Route registry, hooks, use cases
- [Menu Builder Implementation](docs/menu-builder/menu-builder-implementation.md)
- [Architecture Map](docs/menu-builder/menu-builder-architecture-map.md)
- [Code Quality Standards](docs/CODE_QUALITY_STANDARDS.md)
- [Build/Deployment Guide](docs/BUILD_DEPLOYMENT_GUIDE.md)

---

## Multi-Agent Workflow Configuration

### 1. Code Exploration Agent

**When to use:** Understanding codebase structure, finding files, analyzing architecture

**Context to provide:**

- App structure: Next.js App Router in `app/` directory
- Key directories:
  - `app/admin/` - Admin pages and features (product-menu, etc.)
  - `app/(site)/` - Customer-facing pages (account, orders, products, etc.)
  - `app/api/` - API routes
  - `prisma/` - Database schema and migrations
  - `components/` - App-wide shared UI primitives only (ui/, shared/, providers/)
  - `hooks/` - App-wide shared hooks only (use-toast, etc.)
  - `lib/` - Utilities and helpers
  - `lib/navigation/` - Unified navigation system (route registry, hooks)

**File placement rules (co-location):**

This project uses a **co-located file structure**. New files MUST be placed according to their scope — never dump feature-specific files into top-level `components/` or `hooks/`.

| Scope | Components | Hooks | Tests |
|-------|-----------|-------|-------|
| **Site-wide shared** (used across multiple `(site)` pages) | `app/(site)/_components/{feature}/` | `app/(site)/_hooks/` | `__tests__/` co-located next to source |
| **Admin-wide shared** | `app/admin/{feature}/components/` | `app/admin/{feature}/hooks/` | `__tests__/` co-located next to source |
| **Page-specific** (used by one page only) | Same directory as the page | Same directory as the page | `__tests__/` co-located next to source |
| **App-wide primitives** (used across site + admin) | `components/ui/`, `components/shared/` | `hooks/` | `__tests__/` co-located next to source |
| **API routes** | N/A | N/A | `__tests__/` co-located in the API route dir |

**Decision guide for new files:**

1. Is it used by only one page? → Put it in the same directory as that page
2. Is it shared across multiple `(site)` pages? → `app/(site)/_components/{feature}/` or `app/(site)/_hooks/`
3. Is it shared across site + admin? → `components/` or `hooks/` (root level)
4. Is it a UI primitive (button, dialog, input)? → `components/ui/`
5. Is it form-related (field wrapper, heading)? → `components/ui/forms/`

**Existing `_components` feature folders:** `account/`, `ai/`, `cart/`, `category/`, `content/`, `layout/`, `navigation/`, `product/`

**Reference:** See [`docs/architecture/FILE-RESTRUCTURE-CHECKLIST.md`](docs/architecture/FILE-RESTRUCTURE-CHECKLIST.md) for the canonical directory tree with expected file locations.

**Search patterns:**

- Server Actions: `app/**/actions/*.ts`
- React Hooks: `app/**/_hooks/*.ts`, `app/**/hooks/*.ts`, `hooks/*.ts`
- Types: `app/**/types/*.ts`, `types/*.ts`
- Components: `app/**/_components/**/*.tsx`, `components/**/*.tsx`

### 2. Implementation Planning Agent

**When to use:** Designing new features, refactoring, architectural decisions

**Critical considerations:**

- **Type Safety:** All code must maintain end-to-end TypeScript safety
- **Prisma Schema:** Check schema before DB changes
- **Server Actions:** Follow Next.js 14+ server action patterns
- **Testing:** Add tests for business logic and critical paths
- **Migration Safety:** Use safe migration scripts in `dev-tools/`

**Planning checklist:**

1. Review existing patterns in similar features
2. Check if Prisma schema changes needed
3. Identify required server actions
4. Plan component structure (server vs client)
5. Determine state management approach
6. Plan testing strategy
7. Consider migration/deployment impact

### 3. Code Review Agent

**When to use:** Before commits, PR creation, quality checks

**Auto-Review Checklist:**

#### Type Safety

- [ ] No `any` types (use `unknown` + guards instead)
- [ ] All server actions have Zod validation
- [ ] Prisma types used correctly (no manual type definitions)
- [ ] Form schemas use Zod with proper types

#### Next.js Best Practices

- [ ] Server Components by default (`"use client"` only when needed)
- [ ] Server Actions in separate files under `actions/`
- [ ] API routes use proper error handling
- [ ] No client-side data fetching (use Server Components or SWR)

#### Code Quality

- [ ] No unused imports or variables
- [ ] Proper error boundaries for client components
- [ ] Accessibility: semantic HTML, ARIA labels
- [ ] Loading states for async operations
- [ ] Consistent file naming (kebab-case for files, PascalCase for components)

#### Database & Prisma

- [ ] No direct SQL queries (use Prisma)
- [ ] Transactions for multi-step operations
- [ ] Proper error handling for database operations
- [ ] Migration files generated for schema changes

#### Security

- [ ] Authentication checks in server actions
- [ ] Input validation with Zod
- [ ] No sensitive data in client components
- [ ] CSRF protection via server actions

#### Performance

- [ ] Images use Next.js Image component
- [ ] Proper loading states to prevent layout shift
- [ ] Database queries optimized (include relations, select specific fields)
- [ ] React.memo only when proven necessary (avoid premature optimization)

### 4. Testing Agent

**When to use:** Running tests, fixing failures, adding test coverage

**Test commands:**

```bash

npm run test        # Watch mode
npm run test:ci     # CI mode (single run)
npm run precheck    # TypeScript + ESLint
```

**Testing patterns:**

- Unit tests: `*.test.ts` or `*.test.tsx`
- Test location: `__tests__/` folder or co-located with source
- Mock Prisma: Use `jest.mock('@prisma/client')`
- Mock Next.js: Use `jest.mock('next/navigation')`

### 5. Git/Commit Agent

**When to use:** Creating commits, PRs, managing git workflow

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

#### Commit Format

```text
<type>: <brief description>
```

**Rules:**

- Single-line messages only (under 72 characters)
- Imperative mood ("add feature" not "added feature")
- NO version numbers in commits - use release script instead

**Example:** `feat: add webhook log levels`

#### Pre-commit

- Husky runs TypeScript + ESLint automatically
- For docs-only changes: `git commit --no-verify -m "docs: update readme"`

#### CI Path Filtering

CI build (`build-safe`) automatically **skips** for non-code changes:

- `**.md` - Markdown files
- `docs/**` - Documentation folder
- `.archive/**` - Archive folder
- `*.txt`, `LICENSE`, `.gitignore`

This saves CI time and resources for docs-only PRs.

#### PR Workflow

1. Create feature branch from `main`
2. Make changes, commit with conventional format
3. **Run validation before PR:** `npm run precheck && npm run test:ci`
4. Push and create PR
5. After PR approved and merged → run release script

### Versioning & Releases

#### How It Works

| Source | Purpose | Updated By |
|--------|---------|------------|
| **Git Tags** (v0.82.1) | App version at build time | `npm run release:patch` |
| **GitHub Release** | "Update available" banner | `--github-release` flag |
| **CHANGELOG.md** | Human-readable history | Manually in feature PR |
| **package.json** | Vercel build fallback | Manually in feature PR |

- Version is derived from git tags at build time (see `next.config.ts`)
- `package.json` version is for npm only, not the app

#### Release Flow

Use the `/release` skill (recommended) or follow manual steps:

```bash
/release patch              # Skill guides you through workflow
# OR manually:
npm run release:patch -- -y --push --sync-package
```

```text
1. In feature PR: Update CHANGELOG.md AND package.json version
2. Merge PR to main
3. Run: npm run release:patch -- -y --push --sync-package
4. Done!
```

**Important:** Update both CHANGELOG.md AND package.json IN your feature PR before merging. If you forget, the `--sync-package` flag will create a PR to sync package.json before tagging. Vercel needs package.json version because git tags aren't available in its build environment.

#### Changelog Updates

Update `CHANGELOG.md` in your feature PR with the next version number:

```markdown
## [0.80.3] - 2026-02-02

### Changed
- Move auth actions to app/auth (co-locate with auth pages)

### Removed
- Remove test-carousel and test dev pages
```

**Categories:** `Added`, `Changed`, `Fixed`, `Removed`, `Security`

| Action | Creates Tag | Triggers Build | Upgrade Notice |
|--------|-------------|----------------|----------------|
| Merge PR | No | Yes | No |
| `npm run release:patch --push` | Yes | No | No |
| + `--github-release` | Yes | No | **Yes** |

#### Release Commands

```bash
# Interactive mode
npm run release:patch
npm run release:minor

# Non-interactive (Claude-friendly)
npm run release:patch -- -y --push
npm run release:minor -- -y --push --github-release
```

**Flags:**

- `--yes, -y` - Skip prompts
- `--push` - Push tag to origin
- `--sync-package` - Sync package.json version (creates PR if on main)
- `--github-release` - Create GitHub Release (triggers upgrade notice)
- `--message, -m` - Tag annotation message

#### When to Create GitHub Release

- **Yes:** User-facing features, important fixes, breaking changes
- **No:** Internal refactors, dev tooling, minor tweaks

#### GitHub Release Notes (Auto-Generated)

When using `--github-release`, the script **automatically extracts** notes from `CHANGELOG.md`:

1. Reads the changelog section for the release version
2. Maps sections: Added → New Features, Fixed → Bug Fixes, Changed → Improvements
3. Formats into consistent user-facing release notes

**Output format:**

```markdown
## What's New in v0.81.0

### New Features
- Feature description from changelog

### Bug Fixes
- Bug fix from changelog

### Improvements
- Improvement from changelog
```

**Changelog format** (entries are auto-extracted):

```markdown
## 0.81.0 - 2026-02-03

### Added
- **Feature Name**: User-facing description

### Fixed
- Bug description

### Changed
- Improvement description
```

**Guidelines for changelog entries:**

- Write for end users, not developers
- Focus on benefits, not implementation
- One line per change, keep concise
- Omit internal changes (refactors, tests)

#### Quick Reference

```bash
# Standard release (no user notification)
npm run release:patch -- -y --push --sync-package

# User-facing release (shows upgrade notice)
npm run release:minor -- -y --push --sync-package --github-release

# Or use the skill
/release patch
/release minor --github-release
```

### 6. Verification Enforcement (Process Loop)

The agentic workflow is enforced by hooks that track the process loop state machine:

**State machine:** `planning` → `planned` → `implementing` → `pending` → [verify] → `verified`

**SessionStart hook** (`session-start-loop-node.js`): On session start, reads `verification-status.json` for the current branch and injects workflow state context. Tells Claude where it is in the loop and what to do next.

**Stop hook** (`verify-before-stop-node.js`): Blocks Claude from finishing a response when status is `pending` or `partial`. Only fires when source files have uncommitted changes. Allows stop during `planning`, `planned`, `implementing`, and `verified`.

**Commit gate** (`verify-before-commit-node.js`): Blocks `git commit` during `pending`/`partial` states. Allows intermediate commits during `planning`, `planned`, `implementing` and final commits when `verified`.

**State transitions** (managed by the main thread):

| Transition | When |
|-----------|------|
| (none) → `planning` | When feature workflow starts (before plan mode) |
| `planning` → `planned` | After plan approved + committed + ACs doc created |
| `planned` → `implementing` | When coding begins |
| `implementing` → `pending` | After all code written + precheck passes |
| `pending`/`partial` → `verified` | After all ACs pass verification |

**Initiation requirement:** Before entering plan mode, register a `"planning"` entry in `verification-status.json` with `acs_total: 0`. After plan approval, commit the plan, create the ACs doc, and update the entry to `"planned"` with `acs_total` set to the AC count. This activates the entire enforcement chain from the start.

---

## Common Development Patterns

### Server Actions Pattern

```typescript

// app/admin/(product-menu)/actions/example-action.ts
'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  id: z.string(),
  name: z.string().min(1)
})

export async function exampleAction(data: z.infer<typeof schema>) {
  const validated = schema.parse(data)

  const result = await prisma.example.update({
    where: { id: validated.id },
    data: { name: validated.name }
  })

  revalidatePath('/admin/example')
  return { success: true, data: result }
}
```

### SWR Data Fetching Pattern

```typescript

// app/admin/(product-menu)/hooks/useExampleData.ts
import useSWR from 'swr'

export function useExampleData() {
  return useSWR('/api/example', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  })
}
```

### Provider Composition Pattern

```typescript

// app/admin/(product-menu)/ExampleProvider.tsx
const ExampleContext = createContext<ExampleContextValue | null>(null)

export function ExampleProvider({ children }: { children: ReactNode }) {
  const data = useExampleData()
  const mutations = useExampleMutations()
  const state = useExampleState()

  return (
    <ExampleContext.Provider value={{ data, mutations, state }}>
      {children}
    </ExampleContext.Provider>
  )
}

export function useExample() {
  const context = useContext(ExampleContext)
  if (!context) throw new Error('useExample must be used within ExampleProvider')
  return context
}
```

---

## Database Safety Protocols

### Before Schema Changes

1. **Backup:** `npm run db:backup`
2. **Review:** Check `prisma/schema.prisma` for conflicts
3. **Migrate:** `npm run db:safe-migrate` (runs checks first)
4. **Verify:** `npm run db:smoke` (smoke test CRUD)

### Migration Process

```text

# 1. Make schema changes in prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive-name

# 3. For production
npx prisma migrate deploy
```

### Rollback Process

```bash

npm run db:restore
```

---

## Critical Files & Directories

### Must-Read Before Changes

- `prisma/schema.prisma` - Database schema (check before any DB work)
- `app/admin/(product-menu)/constants/action-bar-config.ts` - Menu Builder actions
- `app/admin/(product-menu)/constants/view-configs.ts` - Menu Builder views
- `lib/auth.ts` - Authentication configuration
- `middleware.ts` - Route protection

### Never Modify Directly

- `node_modules/` - Dependencies
- `.next/` - Build output
- `prisma/migrations/` - Generated migrations (create new instead)

### Configuration Files

- `.env.local` - Local environment variables (not in repo)
- `.env.example` - Template for required env vars
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind configuration
- `tsconfig.json` - TypeScript configuration

---

## Build & Deployment

### Local Development

```bash

npm run dev                                                    # Start dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe # Stripe webhooks (Terminal 2)
```

### Build Process

```bash

npm run build              # Standard build
npm run build:safe         # Safe build (backup + checks)
npm run build:no-migrate   # Build without migrations
```

### Deployment (Vercel)

- **Trigger:** Push to `main` branch
- **Env Vars:** Set in Vercel dashboard
- **Build Command:** `npm run vercel-build`
- **Webhooks:** Configure Stripe production webhooks

---

## Auto-Review Triggers

### Pre-Commit Review

Run automatic review before every commit:

1. Type safety check
2. ESLint validation
3. Test execution
4. Import organization

### Pre-PR Review

Before creating pull request:

1. All tests passing
2. No TypeScript errors
3. No ESLint errors
4. Build succeeds locally
5. Database migrations tested
6. Documentation updated if needed

### Code Quality Gates

**Block merge if:**

- CI checks failing
- TypeScript errors present
- ESLint errors present
- Tests failing
- Build failing

---

## AI Assistant Context

### When I Ask You To

#### Add a new feature

1. Use Planning Agent to design approach
2. Review similar existing features
3. Check if schema changes needed
4. Plan component structure
5. Implement with tests
6. Run auto-review
7. Create commit

#### Fix a bug

1. Reproduce the issue
2. Identify root cause
3. Write failing test
4. Implement fix
5. Verify test passes
6. Run auto-review
7. Create commit

#### Refactor code

1. Use Exploration Agent to understand current implementation
2. Plan refactoring strategy
3. Ensure tests exist for current behavior
4. Refactor incrementally
5. Verify tests still pass
6. Run auto-review
7. Create commit

#### Review my code

1. Use Review Agent with full checklist
2. Check type safety
3. Verify patterns match project conventions
4. Test coverage
5. Performance considerations
6. Security review
7. Provide specific, actionable feedback

#### Create a PR

1. Verify all commits follow convention
2. Run full test suite
3. Generate PR description with:
   - Summary of changes
   - Testing performed
   - Migration notes (if applicable)
4. Create PR with `gh pr create`

---

## Workflow Preferences

### Code Style

- **Imports:** Group by external → internal → relative
- **Components:** Functional components with TypeScript
- **Async:** Use async/await (no raw promises)
- **Error Handling:** Try/catch with specific error types
- **Comments:** Only for "why" not "what" (code should be self-documenting)

### Communication Style

- Be concise but thorough
- Explain reasoning for architectural decisions
- Suggest alternatives when relevant
- Ask clarifying questions before major changes
- Provide file paths with line numbers for references

### Multi-Agent Coordination

- **Sequential tasks:** Plan → Implement → Test → Review → Commit
- **Parallel tasks:** Multiple file reads, independent feature analysis
- **Context handoff:** Share relevant findings between agents
- **Iteration:** Review findings before proceeding to implementation

---

## Reference Commands Quick Guide

```bash

# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Start production server

# Code Quality
npm run precheck              # TypeScript + ESLint
npm run typecheck             # TypeScript only
npm run lint                  # ESLint only

# Testing
npm run test                  # Jest watch mode
npm run test:ci               # Jest CI mode

# Database
npm run db:backup             # Backup database
npm run db:restore            # Restore from backup
npm run db:safe-migrate       # Safe migration with checks
npm run db:smoke              # Smoke test CRUD operations
npm run seed                  # Seed database

# Utilities
npm run create-admin          # Create admin user
npm run setup                 # Initial setup
```

---

## Environment Variables Required

See `.env.example` for full list. Critical ones:

```env
# Database
DATABASE_URL=               # Neon PostgreSQL connection string
DIRECT_URL=                # Direct connection (non-pooled)

# Auth
AUTH_SECRET=               # NextAuth secret
GITHUB_CLIENT_ID=          # GitHub OAuth
GITHUB_CLIENT_SECRET=      # GitHub OAuth
GOOGLE_CLIENT_ID=          # Google OAuth
GOOGLE_CLIENT_SECRET=      # Google OAuth

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI
GEMINI_API_KEY=           # Google Gemini API
```

---

## Success Metrics

When evaluating implementations:

- **Type Safety:** 100% (no `any`, all validated)
- **Test Coverage:** Critical paths covered
- **Build Success:** No errors or warnings
- **Performance:** No unnecessary re-renders
- **Accessibility:** WCAG AA compliant
- **Security:** All inputs validated, auth enforced

---

## Feature Development Patterns

Patterns learned from feature development iterations:

### Documentation-Driven Development

For features requiring developer opt-in (like navigation, theming, plugins):

1. **Create use-cases doc first** (`docs/<feature>/use-cases.md`):
   - Quick reference table: scenario → what to do
   - Each use case includes:
     - When it applies
     - What's automatic vs what you opt into
     - Step-by-step with complete code examples
     - Expected result
   - Common mistakes section with fixes
   - Checklist for new implementations

2. **Architecture docs** for complex systems:
   - High-level pattern (e.g., pub/sub, registry)
   - Data flow diagrams
   - Design decisions with rationale

### Test-Driven Feature Addition

When adding new capabilities to existing systems:

1. Write failing tests that describe expected behavior
2. Implement the minimal fix
3. Tests serve as living documentation and regression protection

```bash
# Workflow:
# 1. Write tests for new behavior (they fail)
# 2. Add types/interfaces if needed
# 3. Implement the logic
# 4. Tests pass
# 5. Update docs
```

### Pre-PR Bug Tracking

Use `docs/<feature>/TEMP-PR-FIXES.md` to track bugs/fixes discovered during development:

- Checkboxes for each issue
- Brief description of fix and files changed
- Delete after PR merged

### Extensible Scoring Systems

For systems that need to match/resolve (routes, permissions, themes):

- Use numeric scoring where higher = more specific
- Leave gaps in score ranges for future additions
- New modes can be added without breaking existing behavior

---

## Notes for Claude Code Agents

1. **Always read before editing:** Never propose changes to files you haven't read
2. **Follow patterns:** Match existing code style and architecture
3. **Type safety first:** Maintain end-to-end TypeScript safety
4. **Test critical paths:** Business logic must have tests
5. **Document decisions:** Update docs when making architectural changes
6. **Ask when unclear:** Better to clarify than assume
7. **Commit conventions:** Follow conventional commits format
8. **Safety first:** Use backup/restore scripts for database work
9. **Identify refactor opportunities:** When implementing features, check for patterns that can be reused or deduplicated across the codebase; inform and suggest consolidation when applicable
10. **Keep docs in sync:** Update documentation (especially `docs/menu-builder/`) to match architecture and actual implementation when changes are made
11. **Skip precheck for docs-only:** When committing only `.md` or `.txt` files, use `git commit --no-verify` to skip unnecessary TypeScript compilation

---

**Last Updated:** 2026-02-03
**Maintained By:** yuens1002
**Claude Code Version:** 2.1.4
