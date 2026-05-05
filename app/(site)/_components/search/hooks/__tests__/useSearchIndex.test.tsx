/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useSearchIndex, type SearchProduct } from "../useSearchIndex";

/**
 * Test fixtures only need the fields the hook actually reads (id, name, type,
 * description, tastingNotes, origin, categories[0].category.name). The full
 * FeaturedProduct shape is heavy and not exercised here, so we cast through
 * unknown to keep the fixtures readable.
 */
function fixture(
  partial: Pick<
    SearchProduct,
    "id" | "name" | "slug" | "type" | "description" | "tastingNotes" | "origin"
  > & { categoryName: string; categorySlug: string }
): SearchProduct {
  const { categoryName, categorySlug, ...rest } = partial;
  return {
    ...rest,
    categories: [
      {
        category: { name: categoryName, slug: categorySlug },
      },
    ],
    variants: [],
  } as unknown as SearchProduct;
}

const FIXTURE_CATALOG: SearchProduct[] = [
  fixture({
    id: "p1",
    name: "Ethiopia Yirgacheffe",
    slug: "ethiopia-yirgacheffe",
    type: "COFFEE",
    description: "Bright and floral.",
    tastingNotes: ["Floral", "Citrus", "Bergamot"],
    origin: ["Ethiopia"],
    categoryName: "Light Roast",
    categorySlug: "light-roast",
  }),
  fixture({
    id: "p2",
    name: "Tanzania Peaberry",
    slug: "tanzania-peaberry",
    type: "COFFEE",
    description: "Citrus and winey notes.",
    tastingNotes: ["Black Currant", "Citrus", "Winey"],
    origin: ["Tanzania"],
    categoryName: "Medium Roast",
    categorySlug: "medium-roast",
  }),
  fixture({
    id: "p3",
    name: "Origami Air Dripper",
    slug: "origami-air-dripper",
    type: "MERCH",
    description: "Pour-over dripper.",
    tastingNotes: [],
    origin: [],
    categoryName: "Drinkware",
    categorySlug: "drinkware",
  }),
  fixture({
    id: "p4",
    name: "Aeropress",
    slug: "aeropress",
    type: "MERCH",
    description: "Coffee press.",
    tastingNotes: [],
    origin: [],
    categoryName: "Brew Tools",
    categorySlug: "brew-tools",
  }),
  fixture({
    id: "p5",
    name: "Sumatra Mandheling",
    slug: "sumatra-mandheling",
    type: "COFFEE",
    description: "Earthy with dark chocolate.",
    tastingNotes: ["Earthy", "Cedar", "Dark Chocolate"],
    origin: ["Sumatra"],
    categoryName: "Dark Roast",
    categorySlug: "dark-roast",
  }),
];

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      products: FIXTURE_CATALOG,
      generatedAt: new Date().toISOString(),
    }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useSearchIndex", () => {
  it("loads the index when enabled and exposes status transitions", async () => {
    const { result } = renderHook(() => useSearchIndex(true));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.products).toHaveLength(5);
  });

  it("does NOT fetch when disabled", () => {
    renderHook(() => useSearchIndex(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the merch dripper as a top result for 'air dripper'", async () => {
    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const results = result.current.search("air dripper");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("p3");
    expect(results[0].type).toBe("MERCH");
  });

  it("matches typo 'Yirgachefe' fuzzy → Ethiopia Yirgacheffe", async () => {
    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const results = result.current.search("Yirgachefe");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("p1");
  });

  it("returns coffees with citrus tasting notes for 'citrus'", async () => {
    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const results = result.current.search("citrus");
    const ids = results.map((r) => r.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p2");
  });

  it("returns empty array for blank query", async () => {
    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.search("")).toEqual([]);
    expect(result.current.search("   ")).toEqual([]);
  });

  it("returns empty array when no products match", async () => {
    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.search("zzzzzzzz")).toEqual([]);
  });

  it("sets status to 'error' on fetch failure", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("matches against ALL attached category names, not just primary", async () => {
    // Build a fixture where Medium Roast is a SECONDARY attachment (not the
    // first/primary category). Searching "medium" should still find it.
    const product = fixture({
      id: "p-multi",
      name: "Breakfast Blend",
      slug: "breakfast-blend",
      type: "COFFEE",
      description: "Smooth and balanced.",
      tastingNotes: ["Honey", "Almond"],
      origin: ["Colombia"],
      categoryName: "Filter/Drip Blends",
      categorySlug: "filter-drip-blends",
    });
    // Override the fixture to add Medium Roast as a secondary category.
    const productWithMulti = {
      ...product,
      categories: [
        { category: { name: "Filter/Drip Blends", slug: "filter-drip-blends" } },
        { category: { name: "Medium Roast", slug: "medium-roast" } },
      ],
    } as unknown as SearchProduct;

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        products: [productWithMulti],
        generatedAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const results = result.current.search("medium");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("p-multi");
  });

  it("refetch triggers a new index fetch", async () => {
    const { result } = renderHook(() => useSearchIndex(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => result.current.refetch());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
