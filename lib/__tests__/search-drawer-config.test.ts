/** @jest-environment node */

import { getSearchDrawerConfig } from "../data";

const siteSettingsFindMany = jest.fn();
const categoryLabelFindUnique = jest.fn();
const categoryLabelFindFirst = jest.fn();
const categoryFindUnique = jest.fn();
const categoryFindFirst = jest.fn();
const productFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    siteSettings: {
      findMany: (...args: unknown[]) => siteSettingsFindMany(...args),
    },
    categoryLabel: {
      findUnique: (...args: unknown[]) => categoryLabelFindUnique(...args),
      findFirst: (...args: unknown[]) => categoryLabelFindFirst(...args),
    },
    category: {
      findUnique: (...args: unknown[]) => categoryFindUnique(...args),
      findFirst: (...args: unknown[]) => categoryFindFirst(...args),
    },
    product: {
      findMany: (...args: unknown[]) => productFindMany(...args),
    },
  },
}));

beforeEach(() => {
  siteSettingsFindMany.mockReset();
  categoryLabelFindUnique.mockReset();
  categoryLabelFindFirst.mockReset();
  categoryFindUnique.mockReset();
  categoryFindFirst.mockReset();
  productFindMany.mockReset();
  productFindMany.mockResolvedValue([]);
});

describe("getSearchDrawerConfig", () => {
  it("returns label.name as chipsHeading and categories under it as chips", async () => {
    siteSettingsFindMany.mockResolvedValue([
      { key: "search_drawer_chip_label", value: "label-id-123" },
      { key: "search_drawer_curated_category", value: "" }, // explicitly cleared
    ]);
    categoryLabelFindUnique.mockResolvedValue({
      name: "Top Categories",
      categories: [
        { category: { name: "Single Origin", slug: "single-origin" } },
        { category: { name: "Drinkware", slug: "drinkware" } },
      ],
    });

    const config = await getSearchDrawerConfig();

    expect(config.chipsHeading).toBe("Top Categories");
    expect(config.chips).toEqual([
      { name: "Single Origin", slug: "single-origin" },
      { name: "Drinkware", slug: "drinkware" },
    ]);
    // findUnique called with the stored id
    expect(categoryLabelFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "label-id-123" } })
    );
    // No isVisible filter — the search drawer reads hidden labels too
    const fetchArgs = categoryLabelFindUnique.mock.calls[0][0];
    expect(fetchArgs.where).not.toHaveProperty("isVisible");
  });

  it("falls back to 1st label by order when chip_label setting is missing", async () => {
    siteSettingsFindMany.mockResolvedValue([]); // no rows at all
    categoryLabelFindFirst.mockResolvedValue({
      name: "By Roast Level",
      categories: [
        { category: { name: "Light Roast", slug: "light-roast" } },
      ],
    });
    categoryFindFirst.mockResolvedValue({
      name: "Staff Picks",
      slug: "staff-picks",
    });

    const config = await getSearchDrawerConfig();

    expect(config.chipsHeading).toBe("By Roast Level");
    expect(config.chips).toEqual([
      { name: "Light Roast", slug: "light-roast" },
    ]);
    // findFirst was called with order: asc fallback
    expect(categoryLabelFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { order: "asc" } })
    );
  });

  it("falls back to 1st label when chip_label points to a deleted label", async () => {
    siteSettingsFindMany.mockResolvedValue([
      { key: "search_drawer_chip_label", value: "deleted-label-id" },
    ]);
    categoryLabelFindUnique.mockResolvedValue(null); // label deleted
    categoryLabelFindFirst.mockResolvedValue({
      name: "Origins",
      categories: [],
    });

    const config = await getSearchDrawerConfig();

    expect(config.chipsHeading).toBe("Origins");
    expect(categoryLabelFindFirst).toHaveBeenCalled();
  });

  it("returns curated category default (1st by order) when curated setting is missing", async () => {
    siteSettingsFindMany.mockResolvedValue([
      { key: "search_drawer_chip_label", value: "label-1" },
    ]);
    categoryLabelFindUnique.mockResolvedValue({
      name: "Test",
      categories: [],
    });
    categoryFindFirst.mockResolvedValue({
      name: "First Category",
      slug: "first-category",
    });
    productFindMany.mockResolvedValue([]);

    const config = await getSearchDrawerConfig();

    expect(config.curatedCategoryName).toBe("First Category");
    expect(categoryFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { order: "asc" } })
    );
  });

  it("returns null curatedCategory when explicitly cleared (empty-string sentinel)", async () => {
    siteSettingsFindMany.mockResolvedValue([
      { key: "search_drawer_chip_label", value: "label-1" },
      { key: "search_drawer_curated_category", value: "" },
    ]);
    categoryLabelFindUnique.mockResolvedValue({
      name: "Test",
      categories: [],
    });

    const config = await getSearchDrawerConfig();

    expect(config.curatedCategoryName).toBeNull();
    expect(config.curatedProducts).toEqual([]);
    // Should NOT have queried for any curated category — short-circuited
    expect(categoryFindUnique).not.toHaveBeenCalled();
    expect(categoryFindFirst).not.toHaveBeenCalled();
  });

  it("falls back to 1st category when curated slug points to a deleted category", async () => {
    siteSettingsFindMany.mockResolvedValue([
      { key: "search_drawer_chip_label", value: "label-1" },
      { key: "search_drawer_curated_category", value: "deleted-slug" },
    ]);
    categoryLabelFindUnique.mockResolvedValue({
      name: "Test",
      categories: [],
    });
    categoryFindUnique.mockResolvedValue(null); // category deleted
    categoryFindFirst.mockResolvedValue({
      name: "Fallback",
      slug: "fallback",
    });

    const config = await getSearchDrawerConfig();

    expect(config.curatedCategoryName).toBe("Fallback");
    expect(categoryFindFirst).toHaveBeenCalled();
  });

  it("returns safe defaults when prisma throws", async () => {
    siteSettingsFindMany.mockRejectedValue(new Error("DB down"));
    // Suppress expected console.error noise
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const config = await getSearchDrawerConfig();

    expect(config.chips).toEqual([]);
    expect(config.curatedCategoryName).toBeNull();
    expect(config.curatedProducts).toEqual([]);
    errSpy.mockRestore();
  });
});
