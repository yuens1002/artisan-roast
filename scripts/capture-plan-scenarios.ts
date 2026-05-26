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

/**
 * Map of `seed-dev-scenarios.ts` labels (the comment header on each
 * LICENSE_KEY= line in `.dev-scenario-keys`) to the dev-key ids the store
 * uses in ALL_KEYS. The platform's seed script writes labels as comments;
 * the capture flow keys by id.
 *
 * If this drifts (platform adds/renames a scenario), the capture script
 * skips the unknown label with a warning and continues. The cross-repo
 * fix is to regenerate `.dev-scenario-keys` as id-keyed JSON
 * (planned: PR-NEW in plan.md deferred tracker).
 */
const LABEL_TO_ID: Record<string, string> = {
  "FREE — community plan, no subscription": "dev-free",
  "PRO — priority support active, pools live": "dev-pro",
  "PRO / INACTIVE — priority support subscription lapsed": "dev-pro-inactive",
  "HOSTED / PENDING_VERIFICATION — plans page shows nothing": "dev-hosted-pending",
  "HOSTED / PROVISIONING — plans page shows nothing": "dev-hosted-provisioning",
  "HOSTED / ACTIVE trial — no card on file": "dev-hosted-active-no-card",
  "HOSTED / ACTIVE trial — card on file": "dev-hosted-active-card",
  "HOSTED / CONVERTING — subscription in flight": "dev-hosted-converting",
  "HOSTED / EXPIRED — trial ended, subscribe to restore": "dev-hosted-expired",
  "HOSTED / CANCELLED — trial cancelled, deprovision countdown": "dev-hosted-cancelled",
  "HOSTED / CANCELLED (card on file) — deprovision countdown running": "dev-hosted-cancelled-card",
  "HOSTED / CONVERTED — house-blend active subscription": "dev-hosted-converted",
  "HOSTED / INACTIVE — house-blend subscription lapsed": "dev-hosted-inactive",
  "HOSTED / DEPROVISIONED — plans page shows nothing": "dev-hosted-deprovisioned",
};

/** Parse env-style `.dev-scenario-keys`:
 *  Each `LICENSE_KEY=<value>` line is preceded by a `# <label>` comment.
 *  Returns { devKey → licenseKey } using LABEL_TO_ID to look up the id.
 *  Unknown labels warn in local dev; under STRICT_KEYS they collect and
 *  throw at end so coverage regressions can't slip through CI drift checks. */
function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const unknownLabels: string[] = [];
  let lastLabel: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const label = line.slice(1).trim();
      // Skip the file header comment ("Dev scenario license keys — …")
      if (label.toLowerCase().startsWith("dev scenario license keys")) continue;
      lastLabel = label;
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!lastLabel) continue;
    const id = LABEL_TO_ID[lastLabel];
    if (!id) {
      if (process.env.STRICT_KEYS === "1") {
        unknownLabels.push(lastLabel);
      } else {
        console.warn(`  skip (unknown label): "${lastLabel}"`);
      }
      lastLabel = null;
      continue;
    }
    out[id] = value;
    lastLabel = null;
  }
  if (process.env.STRICT_KEYS === "1" && unknownLabels.length > 0) {
    throw new Error(
      `STRICT_KEYS: ${unknownLabels.length} unknown label(s) in dev-scenario-keys — extend LABEL_TO_ID or remove the source line(s):\n  ${unknownLabels.join("\n  ")}`
    );
  }
  return out;
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
  // Auto-detect: JSON object (starts with `{`) vs env-style (KEY=value lines).
  // The platform repo's `.dev-scenario-keys` is env-style; CI passes JSON via
  // DEV_KEYS_JSON.
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(text) as Record<string, string | { licenseKey: string }>;
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, typeof v === "string" ? v : v.licenseKey])
    );
  }
  return parseEnvFile(text);
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
  // STRICT_KEYS (set by CI): missing scenarios are a coverage gap, not just
  // a warning — fail so the drift detector can't silently leave stale JSONs.
  if (process.env.STRICT_KEYS === "1" && missing > 0) {
    console.error(`STRICT_KEYS: ${missing} scenario(s) had no license key — coverage gap`);
    process.exit(1);
  }
}

void main();
