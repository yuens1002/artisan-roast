---
name: ac-verify
description: Verification sub-agent template — verifies acceptance criteria via screenshots, code review, and tests
---

# AC Verification Sub-Agent

This skill is a **prompt template** for the main thread to spawn a verification sub-agent. The sub-agent receives structured ACs and returns a structured pass/fail report.

**This skill is invoked by the main thread via the Task tool, NOT directly by the user.**

## Usage (by main thread)

The main thread fills in the template and spawns a sub-agent:

```text
Task(subagent_type="general-purpose", prompt="""
Run the AC verification protocol from .claude/skills/ac-verify/SKILL.md.

BRANCH: feat/order-ship-to-edit
DEV_SERVER: http://localhost:3000

ACS:
### UI (verify by screenshots)
- AC-UI-1: Ship To column visible in order history at all breakpoints
- AC-UI-2: Edit button appears only for PENDING orders

### Functional (verify by code review)
- AC-FN-1: PATCH endpoint validates address with Zod
- AC-FN-2: Auth check prevents other users from editing

### Regression (verify by tests + spot-check)
- AC-REG-1: Existing columns unchanged
- AC-REG-2: Cancel button still works for PENDING

PAGES_TO_SCREENSHOT:
- /account (click Orders tab, wait for table to load)

CONTEXT:
- Order history table is in app/(site)/account/OrdersPageClient.tsx
- New endpoint at app/api/user/orders/[id]/address/route.ts
""")
```

## Verification Protocol

When this skill is invoked, follow these steps exactly:

### Step 1: Parse Inputs

Extract from the prompt:

- **Branch name** (for the report header)
- **Dev server URL**
- **AC list** grouped by category (UI / Functional / Regression), each with **What**, **How**, and **Pass** columns
- **Pages to screenshot** with any interaction instructions
- **Additional context** (file paths, component names, behavioral notes)

### Step 1.1: Pre-flight Checklist

Before any screenshots, verify these in order. If any fail, report as BLOCKER and stop.

1. **Dev server reachable**: `curl -s -o /dev/null -w "%{http_code}" {DEV_SERVER}` → expect 200
2. **Admin login works**: Navigate to `/auth/admin-signin`, fill credentials from MEMORY.md, submit, verify redirect (URL no longer contains `/auth/`)
3. **Target page loads**: Navigate to each page in PAGES_TO_SCREENSHOT, verify it's not a 404/error/blank page
4. **First screenshot is not blank**: Take a test screenshot, read it, confirm it shows actual page content (not spinner/blank)

If login fails or pages don't load, STOP and report. Do not proceed to AC verification with a broken environment.

### Step 1.5: Validate How Column Methods

The **How** column in the ACs doc is the verification contract. Before starting any verification, validate that each UI AC's How column specifies the correct method and that you will produce the correct evidence type.

| How prefix | Evidence required | Puppeteer pattern |
|------------|-------------------|-------------------|
| **Screenshot:** | `.png` file path in Agent column | Navigate → wait → screenshot |
| **Interactive:** | `.png` file path in Agent column | Navigate → click/hover → wait → screenshot |
| **Exercise:** | `.png` file path in Agent column | Navigate → interact → fill form → submit → wait for result → screenshot |
| **Code review:** | `file:line` refs in Agent column | Read source files, trace code paths |

**Pre-verification checks (MANDATORY):**

1. **Count How methods**: Tally how many UI ACs use screenshot-based methods (`Screenshot:`, `Interactive:`, `Exercise:`) vs `Code review:`.
2. **Enforce 50% rule**: At least 50% of UI ACs MUST use screenshot-based methods. If they don't, STOP and report: "ACs plan has insufficient screenshot coverage — {n}/{total} UI ACs use screenshot methods. Update How columns before verification."
3. **Match evidence to How**: For each UI AC, confirm you will produce the right evidence type:
   - `Screenshot:` / `Interactive:` / `Exercise:` → You MUST take Puppeteer screenshots and reference `.png` paths
   - `Code review:` → You MUST provide `file:line` references (no screenshot needed)
4. **Never downgrade**: If How says `Screenshot:` but you can't take a screenshot (server down, page broken), mark as BLOCKED — do NOT silently switch to code review.

Record the method per AC in the final report (e.g., `Interactive: clicked edit → dialog opened → .screenshots/verify-dialog.png`).

### Step 2: Verify UI ACs (screenshots)

For each UI AC, read the **What**, **How**, and **Pass** columns:

1. Execute the method described in **How** (navigate, interact, screenshot)
2. Check the screenshot against the **Pass** criteria — this is a binary check, not interpretation
3. Mark PASS only if the Pass condition is fully met
4. Mark FAIL with evidence showing exactly what doesn't match the Pass criteria

For each page in PAGES_TO_SCREENSHOT:

1. Write a Playwright/Puppeteer script to **`.scratch/verify-{feature}.ts`** (gitignored — never `scripts/`):
   - Navigates to the page at the given dev server URL
   - Performs any interaction steps (click tab, wait for load, etc.)
   - Captures screenshots at three breakpoints:
     - mobile: 375x812
     - tablet: 768x1024
     - desktop: 1440x900
   - Saves to `.screenshots/{feature-name}/verify-{breakpoint}-{page-name}.png`

2. Run the script: `npx tsx .scratch/verify-{feature}.ts`

3. Read each screenshot with the Read tool

4. For each UI AC, check every screenshot against the **Pass** column and record:
   - PASS: The Pass condition is fully met in the screenshot
   - FAIL: Describe exactly what doesn't match the Pass criteria
   - N/A: AC doesn't apply at this breakpoint (e.g., mobile-only feature)

### Step 3: Verify Functional ACs (code review)

For each functional AC:

1. Read the relevant source files mentioned in CONTEXT
2. Verify the specific behavior described in the AC:
   - For endpoint ACs: Check route handler, validation schema, error responses
   - For auth ACs: Check session/permission guards
   - For logic ACs: Trace the code path
3. Record PASS/FAIL with specific file:line references as evidence

### Step 4: Verify Regression ACs (tests + spot-check)

1. Run the test suite:

   ```bash
   npm run test:ci
   ```

2. Record total/passed/failed counts

3. For screenshot-based regression ACs, check the screenshots from Step 2 for unchanged elements

4. Record PASS/FAIL for each regression AC

### Step 5: Update ACs Doc + Produce Report

If an ACs tracking doc exists at `docs/plans/{feature}-ACs.md`, **update the Agent column** in the AC tables with your results (PASS/FAIL with brief evidence). Use the 3-column template from `docs/templates/acs-template.md`. Also add notes to the **Agent Notes** section.

If no ACs doc exists yet, produce the report inline in this format:

```markdown
## Verification Report — {BRANCH}

### UI Verification
| AC | Method | mobile | tablet | desktop | Result |
|----|--------|--------|--------|---------|--------|
| AC-UI-1: {description} | Static/Interactive/Exercise: {steps taken} | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| AC-UI-2: {description} | Interactive: clicked edit → dialog opened | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |

### Functional Verification
| AC | Method | Result | Notes |
|----|--------|--------|-------|
| AC-FN-1: {description} | Code review | PASS/FAIL | {evidence with file:line} |
| AC-FN-2: {description} | Code review | PASS/FAIL | {evidence with file:line} |

### Regression
| AC | Method | Result | Notes |
|----|--------|--------|-------|
| AC-REG-1: {description} | Screenshot | PASS/FAIL | {what was checked} |
| AC-REG-2: {description} | Test suite | PASS/FAIL | {test count} |

### Test Suite
- Total: {n} | Passed: {n} | Failed: {n}
{If failures, list the failing test names}

### Issues Found
{List any failures with detailed description, or "None" if all pass}

### Suggested Fixes
{For each failure, suggest what to change, or "N/A" if all pass}

### Overall: {PASS or FAIL}
- ACs passed: {n}/{total}
- Iterations needed: {suggest 0 if all pass, or describe what needs fixing}
```

## Important Rules

1. **Read, don't write — ever.** The sub-agent verifies only. It does NOT edit source files, create plan documents, create ACs docs, or write any file outside of `.screenshots/` and `.scratch/`. If you find yourself about to edit a `.tsx`, `.ts`, `.md`, or any project file, STOP. You are out of scope.
2. **Evidence-based.** Every PASS/FAIL must reference a screenshot or file:line.
3. **Complete coverage.** Verify ALL ACs, don't skip any.
4. **Screenshot every breakpoint.** Even if an AC seems desktop-only, capture all three.
5. **Screenshots go to `.screenshots/{feature-name}/` only.** NEVER save screenshots inside `docs/`, `app/`, `lib/`, or any other project directory. `.screenshots/` is gitignored — subdirectories outside it are not and will be committed to the repo. A screenshot saved anywhere else is a bug.
6. **Verification scripts go to `.scratch/` only — never `scripts/`.** `.scratch/` is gitignored; `scripts/` is committed. Ephemeral QC tooling must not enter the project repo. Delete scripts from `.scratch/` after the session if desired, but never move them into `scripts/`.
7. **Report everything.** Include test output, screenshot paths, and code references.
8. **Combine interaction + evidence.** When an AC requires UI interaction before verification, write a single Playwright flow that interacts and captures evidence in sequence. Do not split interaction and screenshot into separate scripts.
9. **Exercise cautiously.** For ACs requiring form submission or data mutation, verify the UI response (toast, state change) — do not verify database state directly.
10. **Check Pass criteria literally.** Do not interpret — the Pass column is the contract. If it says "no red text visible" and you see red text, it's FAIL regardless of context.
11. **How column is the contract.** The How column dictates the verification method. If How says `Screenshot:`, you MUST take a screenshot — do not substitute code review. The QC validator will reject mismatched evidence.
12. **Screenshot-method ACs need `.png` evidence.** Your Agent column entry for any `Screenshot:`/`Interactive:`/`Exercise:` AC must reference a `.png` file path (e.g., `.screenshots/verify/verify-desktop-plans.png`). Without it, the QC validator will flag the AC.
13. **DEFERRED is not a valid result.** The only valid Agent column values are PASS, FAIL, BLOCKED, and NOT_IMPLEMENTED. Never mark an AC as DEFERRED — especially not for `Interactive:` ACs where the AI response content varies. AI response *content* is non-deterministic; structural *outcomes* (did cards render, did zero cards render, was there no spinner) are deterministic and can always be verified with Puppeteer. If the environment prevents verification, use BLOCKED with an explicit reason — not DEFERRED. BLOCKED = environment failure; FAIL = outcome verified and wrong; PASS = outcome verified and correct.

## Puppeteer Hard Rules

These are NON-NEGOTIABLE. Violating any of these produces unusable verification evidence.

1. **NEVER use `fullPage: true`** — long pages produce unreadably compressed screenshots. Use viewport-only (`page.screenshot()` or `fullPage: false`) or element screenshots (`element.screenshot()`). The viewport captures the first screenful which is sufficient for table/card verification.
2. **NEVER use `page.waitForTimeout()`** — removed in modern Puppeteer. Use `await new Promise(r => setTimeout(r, ms))`.
3. **Always use element screenshots when verifying a specific component** — `const el = await page.$(selector); await el?.screenshot({ path })`. This gives crisp, focused evidence.
4. **Always check the plan's verification section** for constraints (screenshot mode, breakpoints, login requirements) before writing any Puppeteer script.

## Authentication

Admin pages require login. Credentials are stored in Claude Code memory (not in this repo).
Read the admin credentials from MEMORY.md before running Puppeteer scripts.

Login procedure:

1. Navigate to `/auth/admin-signin` (NOT `/auth/signin`)
2. Fill email and password from memory
3. Click submit
4. Wait for redirect — the form uses a React 19 server action, so use `waitForFunction` instead of `waitForNavigation` (see code pattern in MEMORY.md)
5. Verify login succeeded: `page.url()` should NOT contain `/auth/`

For site (non-admin) pages that require auth, use the same credentials at `/auth/signin`.

## Puppeteer Script Template

Use this as the base for screenshot scripts:

```typescript
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
// MANDATORY: All screenshots MUST go inside .screenshots/ — it is gitignored.
// NEVER save to docs/, app/, lib/, or any other project directory.
const OUTPUT_DIR = path.join(process.cwd(), ".screenshots", "verify-{feature-name}");

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  for (const bp of BREAKPOINTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: bp.width, height: bp.height });

    // Navigate to the target page
    await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Perform any interactions (click tabs, open modals, etc.)
    // await page.click('[data-tab="orders"]');
    // await new Promise((r) => setTimeout(r, 1000));

    // HARD RULE: NEVER use fullPage: true — viewport-only or element screenshots only
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `verify-${bp.name}-orders.png`),
    });

    await page.close();
  }

  await browser.close();
  console.log("Screenshots captured.");
}

main().catch(console.error);
```

### Interactive / Exercise Patterns

For ACs that require interaction before screenshots, extend the template:

```typescript
// Interactive: click to open dialog, then screenshot
await page.click('[data-testid="edit-address-btn"]');
await page.waitForSelector('[role="dialog"]', { visible: true });
await page.screenshot({ path: path.join(OUTPUT_DIR, "verify-dialog-open.png") });

// Exercise: fill form and submit
await page.type('#recipientName', 'Jane Doe');
await page.type('#street', '456 Oak Ave');
await page.click('button[type="submit"]');
await page.waitForSelector('[data-sonner-toast]', { visible: true });
await page.screenshot({ path: path.join(OUTPUT_DIR, "verify-after-submit.png") });
```

## Early Exit

Exit early and return a partial report when any of these conditions are met:

- **Dev server not reachable** after 2 attempts (wait 10s between): Report as blocker, return what you have.
- **Wrong page / element not found**: If navigation lands on the wrong page or a key element isn't found after 2 retries with different selectors, mark that AC as BLOCKED (not FAIL), explain what was tried, and move on to the next AC. Do NOT loop indefinitely.
- **No-op scenario**: If the feature under test doesn't exist yet (e.g., no edit button rendered, no API route created), report all related ACs as NOT_IMPLEMENTED and exit immediately. Don't keep searching.
- **Repeated failures**: If 3+ consecutive actions fail (clicks, navigations, screenshots), stop the Puppeteer session, report findings so far, and exit. The main thread will diagnose and re-spawn.

**Key principle:** It's better to return a partial report quickly than to spin for 10+ minutes achieving nothing. The main thread can fix context issues and re-spawn.

## Error Handling

- **Dev server not reachable**: Report as blocker, don't fabricate results
- **Screenshot blank/loading**: Increase wait time and retry once. If still blank, report as blocker.
- **Test suite fails**: Still complete all other verification. Report test failures in the Tests section.
- **File not found**: Report which file was expected and couldn't be read. Mark related ACs as FAIL.
