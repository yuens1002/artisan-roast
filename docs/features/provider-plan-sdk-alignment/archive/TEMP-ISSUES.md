# Session 5 — Post-Verification Issues Log

Discovered during QC screenshot review. **No fixes applied — log only.**  
Delete this file after issues are resolved and merged.

---

## [UI-POOL-1] 3-dot dropdown — should appear on ALL states with pool.cta, not ACTIVE only

**Observed in:** SH-2 (Priority Support ACTIVE) — 3-dot correctly shown there  
**Gap:** ACs schematic and renderer gate `[C] 3-dot` on ACTIVE state only. User expects it on any state where `pool.cta` actions exist (e.g. NONE state with add-on credits surviving plan cancellation — `SELF_HOSTED_FREE_WITH_ADDONS` scenario).  
**Scope:** `PlanPageClient.tsx` — `poolCtaActions` computed only inside ActiveCard; needs lifting to a shared helper usable by other state cards.  
**ACs schematic update needed:** Element presence table row `C — 3-dot header (pool CTAs)` column under NONE/TRIAL/EXPIRED/INACTIVE should be `✓*` (conditional on pool.cta present).

---

## [UI-POOL-2] Depleted pool CTA — should render disabled when used ≥ limit

**Observed in:** Not yet visible in current scenarios (no depleted pools in dev seed)  
**Gap:** Pool CTA items in the 3-dot dropdown render as fully enabled `<DropdownMenuItem>` regardless of pool usage. When a pool is depleted (`used >= limit`), the CTA should be visually disabled.  
**Example:** 1:1 Sessions 1/1 used — "Book Session" should be grayed out/disabled.  
**Scope:** `PlanPageClient.tsx` pool CTA DropdownMenuItem rendering — add `disabled={pool.used >= pool.limit}` on the item.

---

## [UI-POOL-3] Trial Days pool label — should be "Trial Days Remaining"

**Observed in:** HO-1 (`ho-1-no-card.png`), HO-2, HO-3  
**Current:** Pool renders with label `"Trial Days"` (set in resolver)  
**Expected:** `"Trial Days Remaining"`  
**Scope:** Platform resolver `route.ts` — `trialDaysPool` definition: change `label: "Trial Days"` → `label: "Trial Days Remaining"`.

---

## [UI-POOL-4] Trial pool — double unit ("days" in label + "days used" in countLabel)

**Observed in:** HO-1 (`ho-1-no-card.png`)  
**Current rendering:** `Trial Days   |   0 / 14 days used`  
— "days" appears in pool label ("Trial Days") AND in countLabel ("days used") = redundant  
**Expected:** Single unit per pool. One of:  

- `label: "Trial Days Remaining"` + `countLabel: "remaining"` → renders "Trial Days Remaining | 14 / 14 remaining"  
- Or suppress the N/M counter for the trial pool entirely and show days remaining as plain text  
**Scope:** Platform resolver `route.ts` — `countLabel` on trial-days pool. Possibly renderer if counter format needs per-pool suppression.  
**Note:** User flagged concern about hardcoded value — the `0` in `0/14` is `used = daysLimit - daysRemaining` which should be `0` on a fresh trial (14 days remaining → 0 used). Not hardcoded; just confusing because the display convention (used/limit) is backwards from what users expect (remaining/limit).

---

## [UI-POOL-5] Trial Days pool icon — should be clock, not calendar

**Observed in:** HO-1 (`ho-1-no-card.png`), HO-2 (`ho-2-card.png`)  
**Current:** Pool renders with calendar icon (resolver sets `icon: "calendar"` on the trial-days pool)  
**Expected:** Clock icon — trial days is a time countdown, not a calendar event  
**Scope:** Platform resolver `route.ts` — `trialDaysPool` definition: change `icon: "calendar"` → `icon: "clock"` (or equivalent clock icon slug).

---

## [DB-1] Dev seed data unpredictability — recurring session blocker

**Observed across:** Sessions 3, 4, 5 — DB state diverges from expected values between sessions  
**Pattern:** Stripe link IDs (stripeExtendLinkId, stripeSubscribeLinkId), plan actionModals, benefit item lists, and quota countLabels have drifted from initial seed values. Manual DB patches applied in apply-db-prerequisites.ts scripts do not persist reliably or are not re-applied on fresh sessions.  
**Impact:** Session verification blocked or degraded each time — pool CTAs missing, inactiveHeader absent, countLabels wrong — all traced to seed state, not code.  
**Root cause hypothesis:** Dev seed (`prisma/seed.ts` or platform equivalent) does not include all fields required by the resolver. Manual prerequisite scripts are one-off and not idempotent.  
**Recommended fix:** Make Stripe test link IDs, delete-trial actionModals, inactiveHeader/inactiveItems, and quota countLabels part of the canonical dev seed — not manual patches. Seed should be runnable repeatedly (`npx prisma db seed`) and produce consistent results.  
**Scope:** Platform repo seed file(s). Prerequisite scripts at `scripts/apply-db-prerequisites*.ts` should be folded in or deleted after being incorporated into seed.
