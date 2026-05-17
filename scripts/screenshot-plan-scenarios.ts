/**
 * Plan scenarios screenshot harness — single source of truth.
 *
 * Loops every key in SCENARIO_FIXTURES, hits localhost with
 * `?scenario=<key>` (no platform, no DB), and captures the viewport.
 * Mirrors the same fixture file the Jest render harness reads.
 *
 * QUICK START (the working incantation — saves the discovery friction
 * documented in 2026-05-13 retro):
 *
 *   # 1. Pick a free port. Ports 3000/3001/4000 are commonly held by
 *   #    dev servers in other worktrees — check first:
 *   #      netstat -ano | grep -E ":(3000|3001|4000|4100)"
 *   PORT=4100
 *
 *   # 2. Start the dev server in this worktree on that port:
 *   npx next dev -p $PORT &
 *
 *   # 3. Source .env.local AND alias the QA_* vars to the names this
 *   #    harness reads. `npx tsx` is a Node child process and does NOT
 *   #    auto-load .env.local — you must source it in the shell. The
 *   #    QA_* names are what's already in .env.local; the harness reads
 *   #    ADMIN_EMAIL / ADMIN_PASSWORD.
 *   set -a && source .env.local && set +a
 *   export ADMIN_EMAIL="$QA_ADMIN_EMAIL"
 *   export ADMIN_PASSWORD="$QA_ADMIN_PASSWORD"
 *
 *   # 4. Run the harness:
 *   BASE_URL=http://localhost:$PORT npx tsx scripts/screenshot-plan-scenarios.ts
 *
 * Required env:
 *   ADMIN_EMAIL    — admin user email for /auth/admin-signin
 *   ADMIN_PASSWORD — admin user password
 *
 * Optional env:
 *   BASE_URL  — defaults to http://localhost:3000
 *   ONLY      — comma-separated subset of dev keys (e.g. "dev-free,dev-pro")
 *   OUT_DIR   — defaults to .screenshots/plan-scenarios
 *
 * COMMITTING SCREENSHOTS FOR PR REVIEW:
 *
 * The default OUT_DIR (`.screenshots/`) is gitignored. So is any folder
 * named `screenshots/` anywhere in the tree (`.gitignore` has the rule
 * `**` + `/screenshots/`). To produce PR-reviewable artifacts, point
 * OUT_DIR at a non-gitignored folder named something other than
 * `screenshots/` — e.g. `ui-evidence/`:
 *
 *   OUT_DIR=docs/features/<feature>/<session>/ui-evidence \
 *     BASE_URL=http://localhost:$PORT \
 *     npx tsx scripts/screenshot-plan-scenarios.ts
 *
 * Auth: signs in via the /auth/admin-signin form before hitting the plans page.
 */
import puppeteer, { type Browser, type Page } from "puppeteer";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  ALL_KEYS,
  type ScenarioKey,
} from "../app/admin/support/plans/_fixtures/plan-scenarios";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = process.env.OUT_DIR ?? ".screenshots/plan-scenarios";
const ONLY = process.env.ONLY?.split(",")
  .map((s) => s.trim())
  .filter(Boolean) as ScenarioKey[] | undefined;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Missing ADMIN_EMAIL or ADMIN_PASSWORD. Set both in env (e.g. via .env.local) before running the screenshot harness.\n" +
      "For local dev with seeded admin: export ADMIN_EMAIL=...; export ADMIN_PASSWORD=...; tsx scripts/screenshot-plan-scenarios.ts"
  );
  process.exit(1);
}

async function signIn(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/auth/admin-signin`, { waitUntil: "networkidle0" });
  await page.type('input[name="email"]', ADMIN_EMAIL);
  await page.type('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForFunction(() => !window.location.pathname.startsWith("/auth/"), {
      timeout: 15_000,
    }),
  ]);
}

async function captureScenario(page: Page, key: ScenarioKey): Promise<void> {
  const url = `${BASE_URL}/admin/support/plans?scenario=${encodeURIComponent(key)}`;
  await page.goto(url, { waitUntil: "networkidle0" });
  // Give Radix portals + lucide icons a beat to settle.
  await new Promise((r) => setTimeout(r, 250));
  const out = join(OUT_DIR, `${key}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  captured  ${key}  →  ${out}`);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const keys: ScenarioKey[] = ONLY ?? ALL_KEYS;

  const browser: Browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 900 },
  });
  try {
    const page = await browser.newPage();
    await signIn(page);

    console.log(`Capturing ${keys.length} scenarios → ${OUT_DIR}/`);
    for (const key of keys) {
      try {
        await captureScenario(page, key);
      } catch (err) {
        console.error(`  FAILED   ${key}: ${(err as Error).message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

void main();
