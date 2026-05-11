# Captured plan-resolver payloads

Snapshots of `GET /api/plans/resolved` from prod, one file per dev scenario in
`app/admin/support/plans/_fixtures/plan-scenarios.ts`'s `ALL_KEYS`.

These act as the **expected-shape baseline** for the `Plans Resolver Drift`
nightly workflow. When prod's resolver response stops matching what's checked
in here, the workflow fails and opens an issue.

## Refresh discipline

Re-capture, review the diff, commit if the change is intentional.

```bash
DEV_KEYS_FILE=../artisan-roast-platform/.dev-scenario-keys \
  PLATFORM_URL=https://manage.artisanroast.app \
  npm run plans:capture

git diff e2e/plans/captured/
git add e2e/plans/captured/
git commit -m 'chore(plans): refresh prod capture baseline'
```

## What "intentional" means

- Platform shipped a resolver change (added an action, renamed a slug, fixed
  a state branch) — refresh.
- The fixture set in `_fixtures/plan-scenarios.ts` grew or shrank — refresh.

## What "unintentional" means

- An action silently disappeared (e.g. the priority-support `subscribe` CTA on
  `dev-free`) — that's a regression. File a bug in `artisan-roast-platform`
  with the drift diff before refreshing.

## Why this matters

The mock platform in `e2e/mock-platform.mjs` is author-controlled — it can't
catch resolver drift because we write it. Captured payloads come from the
real resolver, so they catch what the mock can't.
