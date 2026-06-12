/**
 * Capture the add-ons packages payload from the platform.
 *
 * Calls the public GET /api/add-ons endpoint and writes the JSON response to
 * e2e/add-ons/captured/packages.json. No auth required.
 *
 * Usage:
 *   tsx scripts/capture-addon-scenarios.ts
 *
 * Or with a custom platform URL:
 *   PLATFORM_URL=https://manage.artisanroast.app tsx scripts/capture-addon-scenarios.ts
 *
 * Refresh discipline: re-run this command, review the git diff, commit if the
 * changes are intentional. Drift between the capture and prod is the diff.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLATFORM_URL = (
  process.env.PLATFORM_URL ?? "https://manage.artisanroast.app"
).replace(/\/+$/, "");

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../e2e/add-ons/captured");
const OUT_FILE = join(OUT_DIR, "packages.json");

async function main() {
  const url = `${PLATFORM_URL}/api/add-ons`;
  console.log(`Fetching ${url} ...`);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    console.error(`Request failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const data: unknown = await response.json();

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");

  console.log(`Written → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
