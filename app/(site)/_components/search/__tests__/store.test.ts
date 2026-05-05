/** @jest-environment node */

import { useSearchDrawerStore } from "../store";

/**
 * Resets the store to its factory state between tests. Zustand stores are
 * module-singletons, so leaking state between tests would leak between
 * assertions.
 */
function resetStore() {
  useSearchDrawerStore.setState({
    isOpen: false,
    activeChipSlug: null,
    query: "",
  });
}

describe("useSearchDrawerStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("initial state: closed, no active chip, empty query", () => {
    const { isOpen, activeChipSlug, query } = useSearchDrawerStore.getState();
    expect(isOpen).toBe(false);
    expect(activeChipSlug).toBeNull();
    expect(query).toBe("");
  });

  it("open() opens the drawer", () => {
    useSearchDrawerStore.getState().open();
    expect(useSearchDrawerStore.getState().isOpen).toBe(true);
  });

  it("setActiveChipSlug(slug) sets the active chip", () => {
    useSearchDrawerStore.getState().open();
    useSearchDrawerStore.getState().setActiveChipSlug("single-origin");
    expect(useSearchDrawerStore.getState().activeChipSlug).toBe("single-origin");
  });

  it("setActiveChipSlug(null) deselects the active chip", () => {
    useSearchDrawerStore.getState().setActiveChipSlug("drinkware");
    useSearchDrawerStore.getState().setActiveChipSlug(null);
    expect(useSearchDrawerStore.getState().activeChipSlug).toBeNull();
  });

  it("close() closes the drawer AND clears active chip + query", () => {
    useSearchDrawerStore.getState().open();
    useSearchDrawerStore.getState().setActiveChipSlug("drinkware");
    useSearchDrawerStore.getState().setQuery("ethiopia");
    useSearchDrawerStore.getState().close();
    const { isOpen, activeChipSlug, query } = useSearchDrawerStore.getState();
    expect(isOpen).toBe(false);
    expect(activeChipSlug).toBeNull();
    expect(query).toBe("");
  });

  it("setQuery(text) updates the query", () => {
    useSearchDrawerStore.getState().setQuery("ethiopia");
    expect(useSearchDrawerStore.getState().query).toBe("ethiopia");
  });

  it("reopening the drawer after typing surfaces an empty query (close-clears-query)", () => {
    useSearchDrawerStore.getState().open();
    useSearchDrawerStore.getState().setQuery("ethiopia");
    useSearchDrawerStore.getState().close();
    useSearchDrawerStore.getState().open();
    expect(useSearchDrawerStore.getState().query).toBe("");
  });

  it("toggle() opens when closed (preserves no-chip)", () => {
    useSearchDrawerStore.getState().toggle();
    expect(useSearchDrawerStore.getState().isOpen).toBe(true);
    expect(useSearchDrawerStore.getState().activeChipSlug).toBeNull();
  });

  it("toggle() closes when open AND clears active chip + query", () => {
    useSearchDrawerStore.getState().open();
    useSearchDrawerStore.getState().setActiveChipSlug("medium-roast");
    useSearchDrawerStore.getState().setQuery("kenya");
    useSearchDrawerStore.getState().toggle();
    const { isOpen, activeChipSlug, query } = useSearchDrawerStore.getState();
    expect(isOpen).toBe(false);
    expect(activeChipSlug).toBeNull();
    expect(query).toBe("");
  });
});

/**
 * Models the chip-vs-query mutual-exclusion logic from SearchDrawer.tsx
 * (handleChipClick + handleQueryChange) as pure functions so the contract
 * can be unit-tested without rendering React.
 *
 * The component-level handlers couple a local query state with the store's
 * activeChipSlug. The state machine they drive is:
 *
 *   chip click on already-active chip → deselect
 *   chip click on other chip          → set chip, clear query
 *   typing non-empty + chip active    → clear chip
 *   typing empty                      → no-op on chip (X clears query only)
 */
type Action =
  | { kind: "chipClick"; slug: string }
  | { kind: "type"; value: string };

function reducer(
  state: { query: string; activeChipSlug: string | null },
  action: Action
): { query: string; activeChipSlug: string | null } {
  if (action.kind === "chipClick") {
    if (state.activeChipSlug === action.slug) {
      return { ...state, activeChipSlug: null };
    }
    return { query: "", activeChipSlug: action.slug };
  }
  // type
  if (action.value && state.activeChipSlug) {
    return { query: action.value, activeChipSlug: null };
  }
  return { ...state, query: action.value };
}

describe("chip + query mutual-exclusion (drawer reducer model)", () => {
  it("chip click sets activeChipSlug AND clears typed query", () => {
    const next = reducer(
      { query: "ethiopia", activeChipSlug: null },
      { kind: "chipClick", slug: "drinkware" }
    );
    expect(next.activeChipSlug).toBe("drinkware");
    expect(next.query).toBe("");
  });

  it("typing while a chip is active clears the chip", () => {
    const next = reducer(
      { query: "", activeChipSlug: "drinkware" },
      { kind: "type", value: "ethiopia" }
    );
    expect(next.activeChipSlug).toBeNull();
    expect(next.query).toBe("ethiopia");
  });

  it("clicking the active chip again deselects it", () => {
    const next = reducer(
      { query: "", activeChipSlug: "drinkware" },
      { kind: "chipClick", slug: "drinkware" }
    );
    expect(next.activeChipSlug).toBeNull();
    expect(next.query).toBe("");
  });

  it("clearing the query (X button) does not affect chip state", () => {
    const next = reducer(
      { query: "ethiopia", activeChipSlug: null },
      { kind: "type", value: "" }
    );
    expect(next.activeChipSlug).toBeNull();
    expect(next.query).toBe("");
  });
});
