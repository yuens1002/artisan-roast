---
name: test-engineer
description: Testing principles for Artisan Roast (ecomm-ai-app) — boundary tests with typed shapes, no brittle assertions, no tautologies. Overrides the generic platform skill with repo-specific conventions.
---

# Test Engineering — Artisan Roast (ecomm-ai-app)

This is the **repo-local** `/test-engineer` skill. It replaces the generic platform skill because tests here cross specific boundaries — the `artisan-roast-sdk` type contract, the platform resolver via captured payloads, and the React renderer for plan-card UI — and each boundary has a settled testing pattern that's worth preserving.

## Three principles

1. **No brittle tests.** A test that breaks on harmless implementation tweaks — copy edits, classname shuffles, refactors that preserve behavior — is worse than no test. Brittle tests get suppressed instead of fixed, then real regressions slip past.

2. **No "foo === foo" tautologies.** A test where the fixture sets X and the assertion checks for X with no logic in between adds no coverage. The test passes whether the implementation is correct or completely broken. Real coverage means there's *something* the implementation could do wrong that the test would catch.

3. **Boundary tests with typed shapes.** Tests live at module boundaries — what data flows in, what flows out. Fixtures use the SDK's TypeScript types with the `satisfies` operator so shape drift breaks the test at compile, not at runtime.

## Universal enforcements

### Probe strings, not realistic copy

Fixture inputs use sentinel strings (`"PROBE_HEADING"`, `"TEST_DESC_SENTINEL"`) so it's visually obvious the test is checking *projection*, not *value*.

```tsx
// ✅ The fixture's descText is intentionally NOT realistic copy.
//    The test proves: whatever's in statusInfo.descText, the renderer projects it.
const PLAN = makePendingPlan({
  statusInfo: { descText: "PROBE_PENDING_42" },
});
render(<PendingCard plan={PLAN} state={PLAN.state} />);
expect(screen.getByText("PROBE_PENDING_42")).toBeInTheDocument();
```

Real copy ("Confirming your payment…") is asserted *exactly once*, at the captured-payload layer (`e2e/plans/captured/*.json` + `__tests__/captured-payloads.test.tsx`), where the resolver's actual output is the source of truth.

### `satisfies` on every fixture

```tsx
import type { Plan, PendingState, PaymentConfirmModal } from "artisan-roast-sdk/plans";

export function makePendingPlan(overrides?: Partial<PendingState>): Plan {
  return {
    slug: "test-plan",
    name: "TEST_PLAN_NAME",
    state: {
      status: "PENDING",
      statusInfo: { descText: "PROBE_DESC" },
      actions: [],
      ...overrides,
    },
    // ... rest of required fields
  } satisfies Plan;  // ← load-bearing: SDK shape drift breaks compile
}
```

If the SDK adds a required field, the factory fails to compile and every test using it goes red. That's boundary detection working as intended — no test logic, just the type system.

### Queries — role-based by default, testids for state machines

**Default:** semantic queries via ARIA roles and accessible names. They serve dual duty (a11y compliance + test resilience) and are the established convention in `app/admin/support/plans/__tests__/contract/`.

```tsx
// ✅ Default — role + accessible name
expect(screen.getByRole("heading", { level: 3, name: "Community" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /pool actions/i })).toBeInTheDocument();
```

**Exception — state-machine sub-states.** When a single component has internal states that render visually similar UI but differ in behavior (modal `preparing` vs `polling` vs `error`), role queries can't distinguish them. Use `data-testid="<component>-<state>"`:

```tsx
// ✅ Allowed for sub-state discrimination
expect(screen.getByTestId("payment-confirm-modal-preparing")).toBeInTheDocument();
expect(screen.queryByTestId("payment-confirm-modal-polling")).not.toBeInTheDocument();
```

Don't sprinkle testids generally. They're a fallback, not a default.

### Presence + absence pairs

Every "this renders X" assertion is paired with "this does NOT render Y" — catches tautologies structurally.

```tsx
// ✅ Pair
expect(screen.getByTestId("feedback-form-modal")).toBeInTheDocument();
expect(screen.queryByTestId("payment-confirm-modal")).not.toBeInTheDocument();

// ❌ Single positive assertion — could pass even if rendering everything
expect(screen.getByTestId("feedback-form-modal")).toBeInTheDocument();
```

### Mock at the platform boundary — never deeper

| Layer | Mockable? |
|-------|-----------|
| `fetch` | ✅ — request shape is the contract |
| `window.open` | ✅ — call args are the contract |
| `router.refresh` from `next/navigation` | ✅ — module-level mock |
| `useToast`, server actions in `../../actions` | ✅ — module-level mock |
| `useState`, `useEffect`, internal handlers | ❌ — couples to React internals; mock breaks the test of the thing you're trying to test |

```tsx
// ✅ Module-boundary mock (existing repo convention)
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
```

### One parameterized test for unification claims

When an AC says "all three triggers produce the same outcome", prove it structurally with `test.each` — not by writing three separate tests that happen to assert the same thing.

```tsx
test.each([
  ["endpoint failure", () => mockFetch.mockRejectedValue(new Error())],
  ["plan reverted to NONE", () => setPlanState("NONE")],
  ["stripe tab closed", () => Object.defineProperty(stripeTab, "closed", { value: true })],
])("error state surfaces on %s", async (_, trigger) => {
  // ... shared setup ...
  trigger();
  await waitFor(() => expect(screen.getByTestId("payment-confirm-modal-error")).toBeInTheDocument());
  expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
});
```

If a fourth trigger gets added later and someone forgets to wire it, the test plan stays honest because the structure forces enumeration.

### No DOM snapshots — one exception

Component-rendered snapshots couple tests to every accidental DOM change. They're explicitly banned in this repo.

**The single exception:** `sdk-scaffold-pins.test.ts` snapshots SDK SCENARIO values. That snapshot is intentional drift detection — its job is to fail when the SDK shifts and force the reviewer to accept or reject the change.

```tsx
// ❌ Banned
expect(container).toMatchSnapshot();
expect(screen.getByTestId("pending-card")).toMatchSnapshot();

// ✅ The one allowed snapshot
expect(pinned).toMatchSnapshot();  // in sdk-scaffold-pins.test.ts only
```

### Skip what TypeScript already catches

`PendingState` has no `pools` field — that's enforced at compile by the SDK type union. Don't write a runtime test for it. The test wouldn't add coverage; it would just be a slower duplicate of the compiler.

## Repo-specific layout

- **Contract tests:** `app/admin/support/plans/__tests__/contract/{component}-card.test.tsx` — one file per renderer
- **Page tests:** `app/admin/support/plans/__tests__/contract/plan-page-client.test.tsx` — composition + dispatch
- **Modal tests:** `app/admin/support/plans/__tests__/contract/{modal-name}.test.tsx`
- **Fixture factory:** `app/admin/support/plans/__tests__/contract/_helpers.ts` — exports `makePlan`, state-specific factories (`makeActive`, `makePending`, etc.), `renderPlans`
- **SDK pins:** `app/admin/support/plans/__tests__/sdk-scaffold-pins.test.ts` + snapshot file alongside
- **Captured payloads:** `e2e/plans/captured/*.json` + `__tests__/captured-payloads.test.tsx` — the *only* place real resolver-supplied copy is asserted

## The five test boundaries for the plans surface

When working in the plans page area, every test belongs to exactly one boundary:

1. **SDK shape → store** — `sdk-scaffold-pins.test.ts`. Catches SDK value drift.
2. **Plan payload → card renderer** — `__tests__/contract/{state}-card.test.tsx`. Catches projection bugs.
3. **User event → action handler → fetch** — modal test files. Catches request-shape bugs.
4. **Plan state poll → component transition** — modal test files with fake timers. Catches transition-logic bugs.
5. **Action modalSlug → which modal opens** — `plan-page-client.test.tsx`. Catches discriminator-gate bugs.

A test that doesn't map cleanly to one of these is usually testing the wrong thing.

## Quick triage when reviewing a test

Before approving a test, ask:

1. Could a reasonable copy edit break this test? → if yes, refactor to use probe strings or roles.
2. Could the implementation be completely broken and still pass this test? → if yes, the assertion is tautological.
3. Does the fixture import the SDK type and use `satisfies`? → if no, the test won't catch SDK drift.
4. Is there an absence assertion to pair with the presence one? → if no, the test might pass on a "renders everything" bug.
5. Does this test mock `useState` / `useEffect` / a component-internal? → if yes, it's testing the wrong layer.

If any of these fail, the test isn't ready.

## Implementation gotchas worth flagging during review

These aren't testing principles — they're patterns that have bitten this codebase
before and that test review is the natural place to catch (because the
test-writer is reading the implementation closely).

### Polling concentration (single orchestrator > leaf timers)

When a component adds `setInterval(() => router.refresh(), N)` (or any
server-state poll), check whether a sibling or parent component already polls
the same data. Two independent leaf-component pollers running concurrently
fire redundant `router.refresh()` calls during their overlap window.

**Pattern that's bitten us:** modal's 5 s poll + card's 10 s poll both running
while a payment was in flight; ~6 redundant fetches per minute. Caught only
when a reviewer asked "is this one polling or two?". Documented in the
2026-05-13 retro.

**The fix:** lift the polling concern to the parent that orchestrates the
state machine. Pick the cadence at the parent based on derived booleans
(e.g. "is the modal in polling state?" → 5 s, "is any plan PENDING?" → 10 s,
otherwise off). Leaf components stay purely presentational. Stable derived
booleans in the effect's deps prevent the "every refresh resets the
interval" trap.

**For test reviewers:** when reviewing tests for a component that introduces
a new `setInterval`, grep the surrounding files for existing intervals
polling the same data. If you find one, push back on the implementation
before approving the tests.
