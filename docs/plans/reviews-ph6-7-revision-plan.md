# Reviews Ph6-7 Revision — Plan

**Branch:** `feat/reviews-ph6-7` (continuing from 7 existing commits, 32/32 ACs verified)
**Base:** `main`

---

## Context

Reviewer feedback on the reviews moderation system requires revisions to the status model, storefront display, and admin tooling. Key changes:

1. **Remove `REMOVED` status** — hard delete replaces soft-remove
2. **Add `PENDING` status** — auto-flagged reviews (spam/profanity) queue for admin triage
3. **FLAGGED reviews visible on storefront** — shown with flag reason(s) as a warning label
4. **Admin response** — admins can reply to any review, shown on storefront
5. **Profanity censoring** — censor (not block) profanity in displayed content
6. **Notification system** — unread review indicator in admin nav, email toggle

### Status Model (revised)

| Status | Storefront | Rating calc | Admin actions |
|--------|-----------|-------------|---------------|
| PUBLISHED | Shown normally | Included | Flag, Reply, Delete |
| FLAGGED | Shown with flag reason(s) | Included | Approve (→PUBLISHED), Reply, Delete |
| PENDING | Hidden | Excluded | Approve (→PUBLISHED), Flag (→FLAGGED), Delete |

---

## Commit Schedule

| # | Message | Risk |
|---|---------|------|
| 0 | `docs: add revision plan for reviews ph6-7` | — |
| 1 | `feat: revise review status model — add PENDING, remove REMOVED, add adminResponse` | Medium (migration, enum swap) |
| 2 | `feat: add profanity censoring and storefront admin response display` | Low |
| 3 | `feat: revise admin reviews UI — Pending tab, reply dialog, updated actions` | Low |
| 4 | `feat: add admin review notification system` | Low |

---

## Acceptance Criteria

See `docs/plans/reviews-ph6-7-revision-ACs.md` for the full ACs tracking doc.

**Summary:** 10 UI + 13 Functional + 4 Regression = 27 ACs total.
