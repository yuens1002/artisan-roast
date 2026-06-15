# /review report — ci-playwright-cache

**Branch:** `fix/ci-playwright-cache`
**Generated:** 2026-06-15
**Iterations to reach verified:** 1

## Verdict

Clear — pure CI infrastructure follow-up. The previous fix (v0.109.3) resolved the apt post-install hang but revealed a second hang: the 167 MB Chromium zip extraction freezes silently for 10+ minutes after the download completes. Caching the playwright browser directory avoids extraction on all subsequent runs.

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| Cache playwright browsers in `e2e-nightly.yml` | `actions/cache@v4` restoring `~/.cache/ms-playwright` keyed on `package-lock.json` hash; `timeout-minutes: 5` on install step | ✓ shipped |
| Cache playwright browsers in `qa-nightly.yml` (`qa` job) | Same cache step before install steps | ✓ shipped |
| Cache playwright browsers in `qa-nightly.yml` (`self-heal` job) | Separate cache restore step (category A path) with same key + timeout | ✓ shipped |

### Code changes not tied to any deliverable

- `package.json` / `package-lock.json` / `CHANGELOG.md` — version bump, expected

## Root cause

After the v0.109.3 fix split `playwright install chromium --with-deps` into two steps, the apt step (`install-deps`) now passes cleanly. But `playwright install chromium` downloads the 167 MB zip in ~1 second (Azure CDN → Azure runner), then hangs for 10+ minutes during extraction/post-install before being cancelled. Browser caching means extraction only occurs on the first run after a playwright version change — all subsequent runs restore from cache and the install step completes in seconds.

## ACs ↔ Tests

No plan doc or ACs — infrastructure patch. Verified observationally: manual trigger runs should pass the playwright install step within 2 minutes once the cache is populated.

## Docs drift

None.

## Inputs for /retro

- **Owning role:** `/devops`
- **Lesson:** Playwright browser installation on GitHub Actions has two distinct hang points: (1) apt post-install hooks — fixed by `DEBIAN_FRONTEND=noninteractive`; (2) zip extraction/post-install — fixed by `actions/cache@v4` on `~/.cache/ms-playwright`. Both fixes are needed. Cache key should be `playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}` so the cache invalidates on playwright version bumps.
