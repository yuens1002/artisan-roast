"use client";

import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";
import type { SearchDrawerCuratedProduct } from "@/lib/data";

/**
 * SearchProduct mirrors the FeaturedProduct shape (productCardIncludes) so
 * results can render directly through `<ProductCard product={p} />` without
 * an adapter layer.
 */
export type SearchProduct = SearchDrawerCuratedProduct;

interface IndexResponse {
  products: SearchProduct[];
  generatedAt: string;
}

export type IndexStatus = "idle" | "loading" | "ready" | "error";

interface IndexState {
  status: IndexStatus;
  products: SearchProduct[];
}

interface UseSearchIndexResult {
  status: IndexStatus;
  products: SearchProduct[];
  search: (query: string) => SearchProduct[];
  refetch: () => void;
}

const SEARCH_LIMIT = 10;

/**
 * Loads the catalog search index from /api/search/index and exposes a
 * MiniSearch-backed search() function. Field-weighted (name > tasting notes >
 * description > origin) and fuzzy-tolerant.
 *
 * State transitions happen only via async fetch callbacks (no synchronous
 * setState inside the effect body) — satisfies react-hooks/set-state-in-effect.
 *
 * No persistence — refetches when `enabled` flips on or refetch() is called.
 */
export function useSearchIndex(enabled: boolean): UseSearchIndexResult {
  const [state, setState] = useState<IndexState>(() => ({
    status: enabled ? "loading" : "idle",
    products: [],
  }));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    fetch("/api/search/index")
      .then((res) => {
        if (!res.ok) throw new Error(`Index fetch failed: ${res.status}`);
        return res.json() as Promise<IndexResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", products: data.products });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useSearchIndex] fetch failed:", err);
        setState({ status: "error", products: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  const miniSearch = useMemo(() => {
    if (state.status !== "ready") return null;
    const ms = new MiniSearch<SearchProduct>({
      idField: "id",
      fields: [
        "name",
        "tastingNotes",
        "description",
        "origin",
        "categoryNames",
      ],
      // Store only the id — full product objects come from state.products by
      // id lookup (avoids serializing the heavier shape into MiniSearch's index).
      storeFields: ["id"],
      extractField: (doc, fieldName) => {
        if (fieldName === "tastingNotes") return doc.tastingNotes.join(" ");
        if (fieldName === "origin") return doc.origin.join(" ");
        // Match against ALL attached categories (primary + secondary) so
        // queries like "medium" find every Medium Roast product, not just
        // the few whose primary category happens to be Medium Roast.
        // /api/search/index already loads all categories for the chip filter;
        // this just completes their use in the search index too.
        if (fieldName === "categoryNames") {
          return doc.categories.map((c) => c.category.name).join(" ");
        }
        const value = (doc as unknown as Record<string, unknown>)[fieldName];
        return typeof value === "string" ? value : "";
      },
      searchOptions: {
        boost: {
          name: 4,
          tastingNotes: 2,
          categoryNames: 2,
          origin: 1.5,
          description: 1,
        },
        fuzzy: 0.2,
        prefix: true,
        combineWith: "AND",
      },
    });
    ms.addAll(state.products);
    return ms;
  }, [state.products, state.status]);

  const search = (query: string): SearchProduct[] => {
    const trimmed = query.trim();
    if (!miniSearch || trimmed.length === 0) return [];
    const results = miniSearch.search(trimmed);
    const limited = results.slice(0, SEARCH_LIMIT);
    return limited
      .map((r) => state.products.find((p) => p.id === r.id))
      .filter((p): p is SearchProduct => p != null);
  };

  return {
    status: state.status,
    products: state.products,
    search,
    refetch: () => {
      setState((prev) => ({ ...prev, status: "loading" }));
      setRefreshKey((k) => k + 1);
    },
  };
}
