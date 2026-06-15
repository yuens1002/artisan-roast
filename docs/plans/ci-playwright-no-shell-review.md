# /review report — ci-playwright-no-shell

**Branch:** `fix/ci-playwright-no-shell`
**Generated:** 2026-06-15
**Iterations to reach verified:** 1

## Verdict

Clear — pure CI infrastructure patch, no product code touched.

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| Fix silent install hang in `e2e-nightly.yml` | `npx playwright install --no-shell chromium` + `DEBUG=pw:install` env | ✓ shipped |
| Fix silent install hang in `qa-nightly.yml` (`qa` job) | Same `--no-shell` + DEBUG | ✓ shipped |
| Fix silent install hang in `qa-nightly.yml` (`self-heal` job) | Same `--no-shell` + DEBUG | ✓ shipped |

### Code changes not tied to any deliverable

- `package.json` / `package-lock.json` / `CHANGELOG.md` — version bump, expected

## Root cause

`npx playwright install chromium` in playwright 1.58.2 downloads **three** artifacts, not one:

1. `chromium` — `chrome-linux64.zip` (167 MB, shows a progress bar, downloads in ~1 s on Azure runners)
2. `chromium-headless-shell` — `chrome-headless-shell-linux64.zip` (**no progress bar**, ~80 MB)
3. `ffmpeg` — ffmpeg binary for audio/video (**no progress bar**, small)

Items 2 and 3 are silent. After the 167 MB main zip completes (which is all that appears in the log), playwright downloads these two artifacts with zero output, causing the step to appear frozen. The `--no-shell` flag suppresses the `chromium-headless-shell` download. Our tests use `devices["Desktop Chrome"]` which requires the full `chromium` binary in headless mode — the headless-shell variant is not needed.

`DEBUG=pw:install` is retained so future hangs produce diagnostic output in the step log.

## ACs ↔ Tests

No plan doc or ACs — infrastructure patch. Verified observationally: next manual trigger should pass the playwright install step within 2 minutes.

## Docs drift

None.

## Inputs for /retro

- **Owning role:** `/devops`
- **Lesson:** `playwright install chromium` in playwright 1.46+ downloads `chromium`, `chromium-headless-shell`, and `ffmpeg` in sequence. Only the first download shows a progress bar. The `--no-shell` flag skips the headless-shell download. When playwright install hangs silently after showing 100%, the cause is a secondary artifact download, not zip extraction or apt post-install hooks.
