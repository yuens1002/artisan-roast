---
name: release
description: Release workflow for Artisan Roast (ecomm-ai-app) — drives the npm `release:*` scripts with `--github-release` on minor+ for user-facing announcements
---

# Release Workflow — Artisan Roast (ecomm-ai-app)

This is the **repo-local** `/release` skill. It overrides the generic platform skill because ecomm-ai-app is a customer-facing product with its own release cadence:

- **Patch releases** (bug fixes, internal refactors, infra) — tag + push, no announcement.
- **Minor / major releases** (user-facing features, breaking changes) — tag + push + GitHub Release. The GitHub Release triggers the in-app upgrade-notice banner so live users get notified.

The actual tagging + GitHub Release work is delegated to [`scripts/release.ts`](../../../scripts/release.ts), invoked via `npm run release:<bump-type>`. This skill orchestrates the surrounding workflow (Phase A on the feature branch, Phase B on main after merge) and decides which flags to pass.

## Arguments

- `$1` — Version bump type: `patch` (default), `minor`, or `major`
- `--docs-only` — Documentation-only PR. Skip version bump + CHANGELOG; produce only a `docs-only release` empty marker commit so the PR-creation gate accepts it.

## Usage

```text
/release              # patch bump (most common)
/release minor        # minor bump (auto-includes --github-release)
/release major        # major bump (auto-includes --github-release)
/release --docs-only  # no version change, no tag, no announcement
```

## Enforcement model

PR creation and merge are gated by Claude Code hooks:

- [`.claude/hooks/pre-pr-via-release-node.js`](../../hooks/pre-pr-via-release-node.js) blocks `gh pr create` unless the latest commit on the branch matches a canonical fingerprint — `bump version to X.Y.Z` (normal release) or `docs-only release` (the `--docs-only` path).
- [`.claude/hooks/review-before-merge-node.js`](../../hooks/review-before-merge-node.js) blocks `gh pr merge` while any review thread is unresolved (Gate 3, runs independently of Copilot inline-comment count).

These are structural guarantees — the steps below describe the natural flow that produces the artifacts the hooks expect.

---

## Steps

### Step 1 — Determine current state

```bash
git rev-parse --abbrev-ref HEAD          # current branch
git status --porcelain                   # uncommitted changes
git tag -l 'v*' --sort=-v:refname | head -1   # latest tag
grep '"version"' package.json            # current package.json version
```

Identify: current branch (feature vs main), whether any work is uncommitted, the latest tag (source of truth for the next version), and the current package.json version.

### Step 2 — Calculate next version

From the latest git tag (NOT package.json — tags are the canonical history):

- **patch**: `0.103.2 → 0.103.3`
- **minor**: `0.103.2 → 0.104.0`
- **major**: `0.103.2 → 1.0.0`

Skip this step entirely for `--docs-only` (no version change).

### Step 3 — Branch-dependent flow

#### If on main with uncommitted changes (wrong state)

**Stop.** Do not commit directly to main. Create a feature branch first:

```bash
git checkout -b fix/<short-description>
```

Then commit the changes on that branch and follow the feature-branch path below. Only return to main for tagging after the PR is merged.

#### If on a feature branch (Phase A — pre-PR)

##### Normal release (patch / minor / major)

1. **Bump `package.json`:**

   ```bash
   npm version <next-version> --no-git-tag-version
   ```

   This updates `package.json` + `package-lock.json` in place without creating a git tag. Tag creation happens in Phase B.

2. **Update `CHANGELOG.md`** — add a new section at the top with the new version number and a summary of changes since the last tag:

   ```bash
   git log $(git tag -l 'v*' --sort=-v:refname | head -1)..HEAD --oneline
   ```

   Format the new section using the categories already in use (`### Added`, `### Fixed`, `### Changed`, etc.). Match existing entry style.

3. **Commit the bump:**

   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "bump version to <next-version>"
   ```

   The commit subject must be exactly `bump version to X.Y.Z` — that's the fingerprint the PR-creation gate looks for.

4. **Push the branch:**

   ```bash
   git push -u origin <branch-name>
   ```

5. **Open the PR:**

   ```bash
   gh pr create --title "<conventional-format-title> (vX.Y.Z)" --body-file <body-path> --base main
   ```

   The hook verifies the latest commit matches the fingerprint and lets the PR creation through. If it blocks, the issue is the commit subject — check `git log -1 --format=%s`.

##### `--docs-only` release

1. **Make any documentation commits** on the branch normally (conventional-format messages — `docs:`, `chore:`, etc.).

2. **Append the marker commit as the final commit:**

   ```bash
   git commit --allow-empty -m "docs-only release"
   ```

   This is an empty commit with no content changes. It exists only to satisfy the structural gate. Any docs commits on the branch must come *before* this marker — the marker has to be the latest commit when `gh pr create` runs.

3. **Push** and **open the PR** as in the normal flow. No version bump, no CHANGELOG entry — the PR body should make clear it's a docs-only change.

##### After PR is open

1. **Wait for Copilot review:**

   ```bash
   gh pr checks <PR-number> --watch
   gh pr view <PR-number> --json reviews
   ```

   Wait until a review from Copilot appears. Don't advance before Copilot has reviewed (the merge gate enforces this for code PRs).

2. **Address every Copilot comment** — apply the fix in code OR post an inline reply explaining why it was declined:

   ```bash
   gh api repos/{owner}/{repo}/pulls/<PR-number>/comments
   ```

   The merge gate blocks merge until every review thread is resolved (a reply alone is NOT enough). Resolve threads via the GraphQL `resolveReviewThread` mutation:

   ```bash
   # List unresolved threads
   gh api graphql -f query='
   { repository(owner: "<owner>", name: "<repo>") {
       pullRequest(number: <PR-number>) {
         reviewThreads(first: 50) {
           nodes { id isResolved comments(first: 1) { nodes { author { login } path body } } }
         }
       }
     }
   }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)'

   # Resolve each unresolved thread
   gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<THREAD_ID>"}) { thread { isResolved } } }'
   ```

3. **Squash-merge:**

   ```bash
   gh pr merge <PR-number> --squash --delete-branch
   ```

4. **Switch to main and pull:**

   ```bash
   git checkout main
   git pull origin main
   ```

5. **Run `/release <bump-type>` again** — you are now on main, so the Phase B tagging path runs.

#### If on main (Phase B — post-merge tagging)

This phase delegates to the npm release script. The skill's job is to choose the right flags based on the bump type.

##### Normal release

```bash
# Patch — internal/bug fix, no user-facing announcement
npm run release:patch -- -y --push --sync-package

# Minor — user-facing feature, triggers in-app upgrade notice
npm run release:minor -- -y --push --sync-package --github-release

# Major — breaking change, triggers in-app upgrade notice
npm run release:major -- -y --push --sync-package --github-release
```

The flags:

- `-y` — non-interactive (script wouldn't otherwise auto-confirm prompts).
- `--push` — push the new tag to origin.
- `--sync-package` — verify `package.json` matches the new tag. If it already does (Phase A bumped it), this is a no-op. If somehow it doesn't, the script will create a separate `chore/bump-version-X.Y.Z` PR to fix it before tagging.
- `--github-release` — **auto-included for minor and major**, never for patch. This is what triggers the user-facing GitHub Release announcement (and the in-app upgrade-notice banner). Patches stay quiet.

The script:

1. Computes the new version from the latest tag.
2. Verifies / syncs `package.json` (with `--sync-package`).
3. Creates the annotated git tag (`vX.Y.Z`).
4. Pushes the tag to origin.
5. (Minor/major only) Creates a GitHub Release using release notes extracted from the new CHANGELOG.md section.

##### `--docs-only` release

**Skip Phase B entirely.** No version change, no tag, no GitHub Release. The PR is already merged into main; nothing else to do.

### Step 4 — Verify

After Phase B completes:

1. Confirm tag exists: `git tag -l 'v*' --sort=-v:refname | head -1`
2. Confirm `package.json` matches: `grep '"version"' package.json`
3. Confirm PR is merged + all threads resolved: `gh pr view <PR-number> --json state,reviews`
4. (Minor/major only) Confirm GitHub Release exists: `gh release view v<version>` — and check the in-app upgrade banner surfaces on a hard refresh of the live storefront.
5. Check Vercel dashboard for the triggered deployment.

---

## Sync Fix

If `package.json` is out of sync with the latest tag (rare, usually after a manual hotfix on main):

```bash
LATEST=$(git tag -l 'v*' --sort=-v:refname | head -1 | sed 's/^v//')

# Update on a feature branch — the script handles the PR/merge
npm run release:patch -- -y --push --sync-package
# (or use the bump type that produces the right next version; if you just need
# to sync without bumping, edit package.json directly on a feature branch and
# go through Phase A)
```

---

## Important Notes

- **Source of truth**: Git tags define version history. `package.json` must stay in sync (the npm script enforces this via `--sync-package`).
- **Vercel trigger**: A pushed commit triggers the Vercel build; tags alone do not. At build time, [`next.config.ts`](../../../next.config.ts) resolves `APP_VERSION` from the latest git tag via `git describe --tags --abbrev=0` when tags are available in the build environment, and falls back to `package.json` only if tags aren't reachable. In practice, the `package.json` bump commit (Phase A) is what triggers the deployment, but the version surfaced by the app is tag-derived when Vercel has access to the repo's tags.
- **GitHub Release ≠ git tag.** A git tag alone doesn't produce a user-facing announcement. The GitHub Release is the announcement. `--github-release` is auto-included for minor/major and explicitly NOT for patch.
- **Docs-only releases skip Phase B.** No tag, no GitHub Release, no version change. The marker commit is purely there to satisfy the structural PR-create gate.
- **The two phases are separated by the merge.** Phase A produces the bump commit on the feature branch + opens the PR. Phase B runs *after* the PR is merged into main and creates the tag. This is by design — the tag is for the merged code, not the WIP feature branch.
- **Companion repo:** `artisan-roast-platform` has its own generic `/release` skill (no GitHub Release step, no npm-script delegation). The two repos diverge intentionally because their cadences differ — the platform repo has no customer upgrade path. (Local checkout path on the maintainer's machine: `c:/Users/yuens/dev/artisan-roast-platform/.claude/skills/release/SKILL.md`.)
