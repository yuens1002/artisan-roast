"use client";

import { create } from "zustand";

interface SearchDrawerState {
  isOpen: boolean;
  /**
   * Slug of the chip currently filtering the drawer body, or null when no
   * chip is active. Mutually exclusive with the typed query — typing clears
   * this; clicking a chip clears the query. Cleared on drawer close.
   */
  activeChipSlug: string | null;
  /**
   * The text the user has typed into the search input. Lives in the store
   * (not component-local state) so it can be cleared synchronously on close
   * — without this, reopening the drawer after typing would surface a stale
   * query from the previous session.
   */
  query: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setActiveChipSlug: (slug: string | null) => void;
  setQuery: (query: string) => void;
}

export const useSearchDrawerStore = create<SearchDrawerState>((set) => ({
  isOpen: false,
  activeChipSlug: null,
  query: "",
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, activeChipSlug: null, query: "" }),
  toggle: () =>
    set((s) =>
      s.isOpen
        ? { isOpen: false, activeChipSlug: null, query: "" }
        : { isOpen: true }
    ),
  setActiveChipSlug: (slug) => set({ activeChipSlug: slug }),
  setQuery: (query) => set({ query }),
}));
