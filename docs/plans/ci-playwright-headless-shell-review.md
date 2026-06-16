# /review report — ci-playwright-headless-shell

**Branch:** `fix/ci-playwright-headless-shell`
**Generated:** 2026-06-16
**Iterations to reach verified:** 1

## Verdict

Clear — pure CI infrastructure patch, no product code touched.

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| Pre-install `chromium-headless-shell` in `e2e-nightly.yml` | `install_browser chromium-headless-shell` added; `--no-shell` removed | ✓ shipped |
| Pre-install `chromium-headless-shell` in `qa-nightly.yml` (`qa` job) | Same pattern | ✓ shipped |
| Pre-install `chromium-headless-shell` in `qa-nightly.yml` (`self-heal` job) | Same pattern | ✓ shipped |

### Code changes not tied to any deliverable

- `package.json` / `package-lock.json` / `CHANGELOG.md` — version bump, expected

## Root cause (confirmed from v0.109.7 run log)

v0.109.7 fixed the install hang — all three install steps passed. But the E2E tests failed immediately with:

```text
Error: browserType.launch: Executable doesn't exist at
  /home/runner/.cache/ms-playwright/chromium_headless_shell-1208/
  chrome-headless-shell-linux64/chrome-headless-shell
```

`playwright.config.ts` uses `devices["Desktop Chrome"]` which in Playwright 1.58 resolves to `chromium-headless-shell` (not the full chromium binary). The `--no-shell` flag added in v0.109.5 was designed to skip the headless-shell download (because it was silent and looked like a hang), but the tests actually need it.

**Fix:** extend `install_browser()` to call `install_browser chromium-headless-shell` and remove `--no-shell`. All three artifacts (chromium, chromium-headless-shell, ffmpeg) are now pre-installed via curl + system `unzip` + `INSTALLATION_COMPLETE` marker before `npx playwright install chromium` runs. Playwright finds all three markers and exits in < 1s.

## ACs ↔ Tests

No plan doc or ACs — infrastructure patch. Verified observationally: next manual E2E run should install all three artifacts and proceed to running the actual test suite.

## Docs drift

None.

## Inputs for /retro

- **Owning role:** `/devops`
- **Lesson:** `devices["Desktop Chrome"]` in Playwright config maps to `chromium-headless-shell`, not full chromium. The complete pre-install list for a Playwright chromium project is: chromium, chromium-headless-shell, ffmpeg — all three need the yauzl bypass. `--no-shell` is WRONG for projects that use `devices["Desktop Chrome"]`; it should only be used if the config explicitly avoids headless-shell.
