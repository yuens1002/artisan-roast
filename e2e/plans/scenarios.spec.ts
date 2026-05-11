/**
 * Plan scenarios e2e — replays captured prod payloads through the browser.
 *
 * For each captured JSON in `e2e/plans/captured/`, intercepts the
 * /api/plans/resolved request and serves the captured response, then drives
 * shape-driven assertions over the rendered DOM.
 *
 * Coverage of the renderer's data→DOM contract is the responsibility of
 * the Jest contract tests (`app/admin/support/plans/__tests__/contract/*`).
 * This e2e suite verifies the full flow against actual prod-shaped data:
 *   - The page navigates without errors.
 *   - For every plan in the captured payload, the heading, badge, action
 *     labels, and pool labels/counts appear in the rendered DOM.
 *
 * Drift is caught at capture time: re-running `npm run plans:capture` and
 * reviewing the JSON diff is the cross-repo drift check. If the diff is
 * intentional, commit. If unexpected, investigate the resolver.
 *
 * Captures live in `e2e/plans/captured/` and are committed to git.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Route } from "@playwright/test";
import type { HydratedPlan, PlanState } from "artisan-roast-sdk/plans";

const CAPTURED_DIR = join(__dirname, "captured");

type Captured = { plans: HydratedPlan[] };

function loadCaptured(key: string): Captured | null {
  const path = join(CAPTURED_DIR, `${key}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Captured;
}

function listCapturedKeys(): string[] {
  if (!existsSync(CAPTURED_DIR)) return [];
  return readdirSync(CAPTURED_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

const captured = listCapturedKeys();

if (captured.length === 0) {
  test.describe("plan scenarios", () => {
    test.skip(true, "No captured payloads found — run `npm run plans:capture` first.");
    test("placeholder", () => {});
  });
} else {
  for (const key of captured) {
    test(`${key} — captured payload renders`, async ({ page }) => {
      const payload = loadCaptured(key)!;

      await page.route("**/api/plans/resolved", async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...payload, resolvedAt: new Date().toISOString() }),
        });
      });

      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.goto("/admin/support/plans");
      await page.waitForLoadState("networkidle");

      // Empty payloads → empty-state copy.
      if (payload.plans.length === 0) {
        await expect(page.getByText(/Plans could not be loaded|no plans/i).first()).toBeVisible();
        expect(errors).toEqual([]);
        return;
      }

      // Each plan's name renders as an <h3>.
      for (const plan of payload.plans) {
        await expect(
          page.getByRole("heading", { level: 3, name: plan.name }).first()
        ).toBeVisible();
      }

      // Drive structural assertions from each plan's state shape.
      for (const plan of payload.plans) {
        const state: PlanState = plan.state;

        if ("badge" in state && state.badge) {
          await expect(page.getByText(state.badge, { exact: false }).first()).toBeVisible();
        }

        // Every action's label appears in the DOM. Buttons or text-buttons.
        for (const action of state.actions) {
          await expect(page.getByText(action.label, { exact: false }).first()).toBeVisible();
        }

        // Every pool's label and count appear.
        if ("pools" in state) {
          for (const pool of state.pools) {
            await expect(page.getByText(pool.label).first()).toBeVisible();
            const total = pool.limit + (pool.purchased ?? 0);
            const countText = `${pool.used} / ${total} ${pool.countLabel}`;
            await expect(page.getByText(countText).first()).toBeVisible();
          }
        }
      }

      expect(errors).toEqual([]);
    });
  }
}
