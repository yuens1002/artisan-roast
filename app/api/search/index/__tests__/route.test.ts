/** @jest-environment node */

import { PRODUCT_LIST_ORDER_BY } from "@/lib/catalog-sort";
import { GET } from "../route";

const findManyMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

describe("GET /api/search/index", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("returns a catalog index with both COFFEE and MERCH products in FeaturedProduct shape", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "p1",
        name: "Ethiopia Yirgacheffe",
        slug: "ethiopia-yirgacheffe",
        type: "COFFEE",
        description: "Floral and citrus notes.",
        tastingNotes: ["Floral", "Citrus"],
        origin: ["Ethiopia"],
        roastLevel: "LIGHT",
        isFeatured: true,
        categories: [
          { category: { name: "Light Roast", slug: "light-roast" } },
        ],
        variants: [
          {
            images: [{ url: "/img.jpg", altText: "alt" }],
            purchaseOptions: [{ priceInCents: 2000 }],
          },
        ],
      },
      {
        id: "p2",
        name: "Origami Air Dripper",
        slug: "origami-air-dripper",
        type: "MERCH",
        description: null,
        tastingNotes: [],
        origin: [],
        roastLevel: null,
        isFeatured: false,
        categories: [],
        variants: [
          {
            images: [],
            purchaseOptions: [{ priceInCents: 3000 }],
          },
        ],
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toHaveLength(2);

    const types = data.products.map((p: { type: string }) => p.type);
    expect(types).toContain("COFFEE");
    expect(types).toContain("MERCH");

    // v2 shape: ProductCard-compatible payload — relations come through
    // `categories[0].category` and `variants[0].{images,purchaseOptions}`.
    const coffee = data.products.find((p: { id: string }) => p.id === "p1");
    expect(coffee.categories[0].category).toEqual({
      name: "Light Roast",
      slug: "light-roast",
    });
    expect(coffee.variants[0].images[0]).toEqual({
      url: "/img.jpg",
      altText: "alt",
    });
    expect(coffee.variants[0].purchaseOptions[0].priceInCents).toBe(2000);

    const merch = data.products.find((p: { id: string }) => p.id === "p2");
    expect(merch.categories).toEqual([]);
    expect(merch.variants[0].images).toEqual([]);
    expect(merch.variants[0].purchaseOptions[0].priceInCents).toBe(3000);

    expect(data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("does not filter by type — index must include all product types", async () => {
    findManyMock.mockResolvedValue([]);
    await GET();

    const callArg = findManyMock.mock.calls[0][0];
    expect(callArg.where).toEqual({ isDisabled: false });
    expect(callArg.where.type).toBeUndefined();
  });

  it("loads ALL category attachments (no isPrimary filter) so the chip filter can match secondary categories", async () => {
    findManyMock.mockResolvedValue([]);
    await GET();

    const callArg = findManyMock.mock.calls[0][0];
    expect(callArg.include.categories.where).toBeUndefined();
    // Sorted so `categories[0]` is still the primary (keeps ProductCard URL routing canonical).
    expect(callArg.include.categories.orderBy).toEqual({ isPrimary: "desc" });
  });

  it("uses the shared PRODUCT_LIST_ORDER_BY constant — mirrors getProductsByCategorySlug", async () => {
    findManyMock.mockResolvedValue([]);
    await GET();

    const callArg = findManyMock.mock.calls[0][0];
    // The route imports PRODUCT_LIST_ORDER_BY from lib/catalog-sort, the
    // same module getProductsByCategorySlug imports it from. Asserting
    // referential equality (not just shape) guarantees the storefront
    // category page and the chip filter cannot drift apart — any change
    // to one surface flows through the shared constant.
    expect(callArg.orderBy).toBe(PRODUCT_LIST_ORDER_BY);
  });

  it("returns 500 with error JSON on Prisma failure", async () => {
    findManyMock.mockRejectedValue(new Error("DB down"));
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to build search index");
  });
});
