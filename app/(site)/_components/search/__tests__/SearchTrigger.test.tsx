/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { SearchTrigger } from "../SearchTrigger";
import { useSearchDrawerStore } from "../store";

function resetStore() {
  useSearchDrawerStore.setState({ isOpen: false, activeChipSlug: null });
}

describe("SearchTrigger", () => {
  beforeEach(() => {
    resetStore();
  });

  it("desktop variant: clicking opens the search drawer", () => {
    render(<SearchTrigger />);
    expect(useSearchDrawerStore.getState().isOpen).toBe(false);
    fireEvent.click(screen.getByRole("button"));
    expect(useSearchDrawerStore.getState().isOpen).toBe(true);
  });

  it("mobile-sheet variant: clicking opens the search drawer", () => {
    render(<SearchTrigger variant="mobile-sheet" />);
    expect(useSearchDrawerStore.getState().isOpen).toBe(false);
    fireEvent.click(screen.getByRole("button"));
    expect(useSearchDrawerStore.getState().isOpen).toBe(true);
  });

  it("mobile-sheet: invokes onBeforeOpen BEFORE opening the search drawer", () => {
    // Order matters — onBeforeOpen exists so the parent menu Sheet can close
    // BEFORE the search drawer opens. If open() fired first, the two overlays
    // would briefly stack.
    const calls: string[] = [];
    const onBeforeOpen = jest.fn(() => calls.push("before"));
    const originalOpen = useSearchDrawerStore.getState().open;
    const wrappedOpen = jest.fn(() => {
      calls.push("open");
      originalOpen();
    });
    useSearchDrawerStore.setState({ open: wrappedOpen });

    render(
      <SearchTrigger variant="mobile-sheet" onBeforeOpen={onBeforeOpen} />
    );
    fireEvent.click(screen.getByRole("button"));

    expect(onBeforeOpen).toHaveBeenCalledTimes(1);
    expect(wrappedOpen).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["before", "open"]);

    // Restore original open for other tests
    useSearchDrawerStore.setState({ open: originalOpen });
  });

  it("desktop variant: also forwards onBeforeOpen if provided", () => {
    const onBeforeOpen = jest.fn();
    render(<SearchTrigger onBeforeOpen={onBeforeOpen} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onBeforeOpen).toHaveBeenCalledTimes(1);
  });

  it("does not error when onBeforeOpen is omitted", () => {
    render(<SearchTrigger variant="mobile-sheet" />);
    expect(() =>
      fireEvent.click(screen.getByRole("button"))
    ).not.toThrow();
  });
});
