---
name: ui-verify
description: Visual UI verification workflow with responsive screenshot comparison and AC validation
---

# UI Verification Skill

This skill provides a systematic approach to verify UI changes across responsive breakpoints with acceptance criteria validation.

## Arguments

- `--before` - Take "before" screenshots (run before making changes)
- `--after` - Take "after" screenshots (run after making changes)
- `--check "AC"` - Verify a specific acceptance criterion against screenshots
- `--verify-all` - Verify all pending ACs from the feature documentation
- `--compare` - View and compare before/after screenshots
- `--clean` - Remove screenshot files

## Quick Reference

| Task | Command |
|------|---------|
| Capture baseline | `/ui-verify --before` |
| Capture after changes | `/ui-verify --after` |
| Check single AC | `/ui-verify --check "Add to Cart button shows price on right"` |
| Full verification | `/ui-verify --verify-all` |
| Compare visually | `/ui-verify --compare` |

## Workflow Overview

### Standard Verification Loop

```text
1. /ui-verify --before               # Capture current state
2. Make code changes                  # Implement the fix
3. /ui-verify --after                # Capture new state
4. /ui-verify --check "AC here"      # Verify specific AC
5. Iterate if needed                  # Fix issues, repeat 3-4
6. /ui-verify --verify-all           # Final verification
7. Commit when all ACs pass          # Create PR
```

### AC Verification Flow

When using `--check` or `--verify-all`:

1. Take screenshots at all breakpoints (mobile, tablet, desktop)
2. Read each screenshot and analyze against the AC
3. Return structured result:

```text
## UI Verification Report

### AC: "Add to Cart button shows price on right"

| Breakpoint | Status | Notes |
|------------|--------|-------|
| mobile     | PASS   | Button left, price right - correct layout |
| tablet     | PASS   | Button left, price right - correct layout |
| desktop    | PASS   | Button left, price right - correct layout |

**Result: PASS**
```

Or if issues found:

```text
## UI Verification Report

### AC: "ProductCard shows horizontal layout"

| Breakpoint | Status | Notes |
|------------|--------|-------|
| mobile     | FAIL   | Layout is vertical, button stacked above price |
| tablet     | PASS   | Correct horizontal layout |
| desktop    | PASS   | Correct horizontal layout |

**Result: FAIL**

### Issues Found:
1. Mobile breakpoint (375px): Layout should be horizontal but renders vertical

### Suggested Fix:
Check flex-direction in CardFooter - may need `flex-row` at all breakpoints
```

## Script Placement — Durable vs. Ephemeral

| Type | Where | Why |
|------|-------|-----|
| **Durable** (general responsive capture) | `scripts/` | Committed — shared utility |
| **Ephemeral** (feature-specific QC script) | `.scratch/` | Gitignored — discard after session |

**Rule:** Feature-specific verification scripts always go in `.scratch/`, never `scripts/`. Only scripts that will be useful across future sessions belong in `scripts/`. Both `.scratch/` and `.screenshots/` are gitignored.

## Screenshot Script

The project includes a screenshot script at `scripts/take-responsive-screenshots.ts`.

### Usage

```bash
# Take before screenshots
npx tsx scripts/take-responsive-screenshots.ts before

# Take after screenshots
npx tsx scripts/take-responsive-screenshots.ts after
```

### Breakpoints Captured

| Name | Width | Height | Description |
|------|-------|--------|-------------|
| mobile | 375px | 812px | iPhone X |
| tablet | 768px | 1024px | iPad |
| desktop | 1440px | 900px | Desktop |

### Screenshots Captured

| Component | File Pattern |
|-----------|--------------|
| ProductCards (homepage) | `{prefix}-{breakpoint}-product-cards.png` |
| Product detail page | `{prefix}-{breakpoint}-product-page.png` |
| Footer | `{prefix}-{breakpoint}-footer.png` |
| Nav dropdown (desktop) | `{prefix}-desktop-nav-dropdown.png` |
| Mobile menu | `{prefix}-{mobile/tablet}-mobile-menu.png` |

### Screenshots Location

Screenshots are saved to `.screenshots/` directory (gitignored):

```text
.screenshots/
├── after-desktop-product-cards.png
├── after-desktop-product-page.png
├── after-desktop-footer.png
├── after-desktop-nav-dropdown.png
├── after-mobile-product-cards.png
├── after-mobile-product-page.png
├── after-mobile-footer.png
├── after-mobile-mobile-menu.png
├── after-tablet-product-cards.png
├── after-tablet-product-page.png
├── after-tablet-footer.png
└── after-tablet-mobile-menu.png
```

## Verification Checklist

When comparing screenshots, verify:

### Layout

- [ ] Elements maintain correct reading order (left-to-right, top-to-bottom)
- [ ] Column count changes correctly at breakpoints
- [ ] No unexpected overflow or wrapping
- [ ] Horizontal layouts remain horizontal at all breakpoints (unless specified)

### Spacing

- [ ] Consistent horizontal gaps between items
- [ ] Consistent vertical gaps between items
- [ ] Padding matches design requirements

### Visual Consistency

- [ ] Font sizes remain appropriate at each breakpoint
- [ ] Interactive elements remain accessible (touch targets)
- [ ] No text truncation that breaks meaning

### Component-Specific

**ProductCard:**

- [ ] "Add to Cart" button visible and clickable
- [ ] Price displayed (unless hidePrice prop is true)
- [ ] Image aspect ratio maintained
- [ ] Card hover effects work (desktop)

**ProductQuantityCart:**

- [ ] +/- stepper buttons visible and functional
- [ ] Quantity display readable
- [ ] "Add to Cart" button visible with price overlay (when idle)

## Extending the Screenshot Script

To capture additional pages or components, modify `scripts/take-responsive-screenshots.ts`:

```typescript
// Add new page captures
await page.goto(`${BASE_URL}/your-page`, { waitUntil: 'networkidle2' });
await page.screenshot({
  path: path.join(OUTPUT_DIR, `${prefix}-${bp.name}-your-component.png`),
  fullPage: false,
});
```

## Puppeteer Hard Rules

These are NON-NEGOTIABLE. Violating any produces unusable evidence.

1. **NEVER use `fullPage: true`** — viewport-only or element screenshots only.
2. **NEVER use `page.waitForTimeout()`** — use `await new Promise(r => setTimeout(r, ms))`.
3. **Prefer element screenshots** for targeted verification: `const el = await page.$(selector); await el?.screenshot({ path })`.

## Authentication

Admin pages require login at `/auth/admin-signin`:

```typescript
await page.goto(`${BASE_URL}/auth/admin-signin`, { waitUntil: "networkidle2" });
await page.click('input[name="email"]', { clickCount: 3 });
await page.keyboard.type("admin@artisanroast.com");
await page.click('input[name="password"]', { clickCount: 3 });
await page.keyboard.type("ivcF8ZV3FnGaBJ&#8j");
await page.click('button[type="submit"]');
await page.waitForFunction(() => !window.location.href.includes("/auth/"), { timeout: 15000 }).catch(() => {});
await new Promise(r => setTimeout(r, 2000));
```

## Prerequisites

- Dev server running on localhost:3000
- Puppeteer installed: `npm install -D puppeteer`

## Common Issues

### Screenshots show blank or loading state

Increase wait times in the script:

```typescript
await new Promise(r => setTimeout(r, 2000)); // Increase from 1000
```

### Menu not opening

The script uses JavaScript click fallbacks. If still failing, check:

- Menu button selector in script
- Any SSR hydration delays

### Inconsistent screenshots

Ensure:

- Dev server is freshly started
- No dynamic content affecting layout
- Browser cache cleared

## Example: Verifying Add-to-Cart Feature

```text
# 1. Define ACs (from docs/feature/add-to-cart/README.md)
ACs:
- ProductCard: "Add to Cart" button on left, price on right
- ProductQuantityCart: +/- stepper on left, "Add to Cart" on right
- Button transforms: idle → adding → added → buy-now/checkout-now

# 2. Capture current state
/ui-verify --before

# 3. Make changes to components

# 4. Capture new state
/ui-verify --after

# 5. Verify each AC
/ui-verify --check "ProductCard shows Add to Cart button on left, price on right"
/ui-verify --check "ProductQuantityCart shows +/- stepper on left"

# 6. Fix any failures, repeat 4-5

# 7. Final verification
/ui-verify --verify-all

# 8. Commit when all pass
```
