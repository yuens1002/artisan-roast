# /review report — ci-playwright-fast-extract

**Branch:** `fix/ci-playwright-fast-extract`
**Generated:** 2026-06-15
**Iterations to reach verified:** 1

## Verdict

Clear — pure CI infrastructure patch, no product code touched.

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| Fix yauzl extraction hang in `e2e-nightly.yml` | curl download + system unzip + INSTALLATION_COMPLETE marker | ✓ shipped |
| Fix yauzl extraction hang in `qa-nightly.yml` (`qa` job) | Same pattern | ✓ shipped |
| Fix yauzl extraction hang in `qa-nightly.yml` (`self-heal` job) | Same pattern | ✓ shipped |

### Code changes not tied to any deliverable

- `package.json` / `package-lock.json` / `CHANGELOG.md` — version bump, expected

## Root cause (confirmed from debug logs)

`playwright install chromium` in playwright 1.58.2 extracts the 167 MB Chrome zip using `yauzl` (a pure JavaScript zip library in `lib/zipBundleImpl.js`). The debug log confirms:

```text
pw:install extracting archive   ← 14:09:28.752Z
##[error] timed out after 5 min ← 14:14:39.344Z (zero output in between)
```

`yauzl` runs in Node.js and is far slower than the system's native `unzip` (C implementation) for large archives with thousands of files. The extraction hangs (or runs for 10+ minutes) on GitHub Actions shared runners.

**Fix:** bypass playwright's yauzl extraction by:

1. Downloading the zip with `curl` (playwright's CDN URL is read dynamically from `playwright-core/lib/server/registry/index.js`)
2. Extracting with system `unzip` (native, completes in ~30-60s)
3. Setting executable permissions on the chrome binary
4. Writing playwright's `INSTALLATION_COMPLETE` marker file to `$CHROMIUM_DIR/INSTALLATION_COMPLETE`

When the subsequent `npx playwright install --no-shell chromium` runs, it checks for the marker file first (`downloadBrowserWithProgressBar` in `browserFetcher.js`) and skips download+extraction for chromium. It only downloads ffmpeg (small, fast). Cache then saves `~/.cache/ms-playwright` and all future runs hit the cache.

## ACs ↔ Tests

No plan doc or ACs — infrastructure patch. Verified observationally: next manual trigger should pass the playwright install step within 2 minutes.

## Docs drift

None.

## Inputs for /retro

- **Owning role:** `/devops`
- **Lesson:** `playwright install chromium` on GitHub Actions hangs because it uses `yauzl` (pure JavaScript) for zip extraction, not the system `unzip`. For large browser zips (167 MB+), yauzl runs indefinitely on shared runners. The fix pattern: pre-download with `curl`, extract with `unzip`, write `INSTALLATION_COMPLETE` marker, then run `playwright install` for remaining deps (ffmpeg). The marker file path is `~/.cache/ms-playwright/chromium-{revision}/INSTALLATION_COMPLETE` — verified from `browserFetcher.js` source. Get the chromium dir and URL dynamically from `playwright-core/lib/server/registry/index.js` so the approach is version-agnostic.
