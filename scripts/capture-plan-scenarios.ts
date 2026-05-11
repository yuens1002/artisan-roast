/**
 * Capture prod plan-scenario payloads.
 *
 * For each dev license key, calls /api/plans/resolved and writes the JSON
 * response to e2e/plans/captured/<key>.json. The resolvedAt timestamp is
 * normalised to a placeholder so reruns don't diff trivially.
 *
 * Usage:
 *   PLATFORM_URL=https://manage.artisanroast.app \
 *   DEV_KEYS_FILE=../artisan-roast-platform/.dev-scenario-keys \
 *   tsx scripts/capture-plan-scenarios.ts
 *
 * Or with inline keys:
 *   DEV_KEYS_JSON='{"dev-free":"sk_live_...","dev-pro":"sk_live_..."}' \
 *   tsx scripts/capture-plan-scenarios.ts
 *
 * The DEV_KEYS_FILE format expected: JSON object mapping dev-key → license key.
 * artisan-roast-platform's seed-dev-scenarios.ts writes this file format.
 *
 * Refresh discipline: re-run this command, review the git diff, commit if
 * the changes are intentional. Drift between captures and prod is the diff.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_KEYS } from "../app/admin/support/plans/_fixtures/plan-scenarios";

const PLATFORM_URL = (
  process.env.PLATFORM_URL ?? "https://manage.artisanroast.app"
).replace(/\/+$/, "");

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "e2e", "plans", "captured");

interface ResolvedResponse {
  plans: unknown[];
  resolvedAt: string;
}

async function loadKeys(): Promise<Record<string, string>> {
  if (process.env.DEV_KEYS_JSON) {
    return JSON.parse(process.env.DEV_KEYS_JSON);
  }
  const file = process.env.DEV_KEYS_FILE;
  if (!file) {
    throw new Error("Set DEV_KEYS_FILE or DEV_KEYS_JSON");
  }
  const text = await readFile(file, "utf8");
  return JSON.parse(text);
}

async function captureOne(key: string, licenseKey: string): Promise<void> {
  const url = `${PLATFORM_URL}/api/plans/resolved`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${licenseKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }
  const body = (await resp.json()) as ResolvedResponse;
  // Normalise resolvedAt so reruns don't diff trivially.
  const out = { ...body, resolvedAt: "<NORMALISED_AT_CAPTURE>" };
  await writeFile(join(OUT_DIR, `${key}.json`), JSON.stringify(out, null, 2) + "\n", "utf8");
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const keys = await loadKeys();

  console.log(`Capturing ${ALL_KEYS.length} scenarios from ${PLATFORM_URL}`);
  let ok = 0, missing = 0, failed = 0;

  for (const devKey of ALL_KEYS) {
    const license = keys[devKey];
    if (!license) {
      console.warn(`  SKIP    ${devKey} — no license key found`);
      missing++;
      continue;
    }
    try {
      await captureOne(devKey, license);
      console.log(`  ok      ${devKey}`);
      ok++;
    } catch (err) {
      console.error(`  FAILED  ${devKey}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone — ok ${ok}, missing ${missing}, failed ${failed}`);
  if (failed > 0) process.exit(1);
}

void main();
