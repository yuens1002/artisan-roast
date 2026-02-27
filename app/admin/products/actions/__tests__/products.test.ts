/** @jest-environment node */

import { ProductType, RoastLevel } from "@prisma/client";

// Mock Prisma
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockCreateMany = jest.fn();
const mockDeleteMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    categoriesOnProducts: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
    $transaction: (fn: unknown) => {
      if (typeof fn === "function") {
        return fn({
          product: {
            create: mockCreate,
            update: mockUpdate,
            delete: mockDelete,
          },
          categoriesOnProducts: {
            createMany: mockCreateMany,
            deleteMany: mockDeleteMany,
          },
        });
      }
      return mockTransaction(fn);
    },
  },
}));

jest.mock("@/lib/admin", () => ({
  requireAdmin: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/config/app-settings", () => ({
  getWeightUnit: jest.fn().mockResolvedValue("grams"),
}));

jest.mock("@/lib/weight-unit", () => ({
  fromGrams: jest.fn((grams: number) => grams),
  roundToInt: jest.fn((value: number) => Math.round(value)),
}));

import { getProduct, createProduct, updateProduct, deleteProduct } from "../products";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getProduct", () => {
  it("should return product data when found", async () => {
    const mockProduct = {
      id: "prod-1",
      name: "Test Coffee",
      slug: "test-coffee",
      type: ProductType.COFFEE,
      categories: [{ categoryId: "cat-1" }],
      variants: [
        {
          id: "var-1",
          name: "12oz Bag",
          weight: 340,
          stockQuantity: 150,
          order: 0,
          purchaseOptions: [],
        },
      ],
    };

    mockFindUnique.mockResolvedValue(mockProduct);

    const result = await getProduct("prod-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(
        expect.objectContaining({
          id: "prod-1",
          categoryIds: ["cat-1"],
        })
      );
    }
  });

  it("should return error when product not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getProduct("nonexistent");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Product not found");
    }
  });
});

describe("createProduct", () => {
  it("should create a coffee product with valid input", async () => {
    const input = {
      productType: ProductType.COFFEE,
      name: "Midnight Blend",
      slug: "midnight-blend",
      description: "A dark roast blend",
      heading: "The Story",
      isOrganic: false,
      isFeatured: true,
      isDisabled: false,
      roastLevel: RoastLevel.DARK,
      origin: ["Brazil", "Colombia"],
      variety: "Bourbon",
      altitude: "1800m",
      tastingNotes: ["Dark Chocolate", "Caramel"],
      processing: "Natural",
      categoryIds: ["cat-1"],
    };

    mockCreate.mockResolvedValue({ id: "new-prod", ...input });

    const result = await createProduct(input);

    expect(result.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Midnight Blend",
          type: ProductType.COFFEE,
          roastLevel: RoastLevel.DARK,
          processing: "Natural",
        }),
      })
    );
  });

  it("should create a merch product with valid input", async () => {
    const input = {
      productType: ProductType.MERCH,
      name: "Heritage Mug",
      slug: "heritage-mug",
      description: "A ceramic mug",
      heading: "Description",
      isOrganic: false,
      isFeatured: true,
      isDisabled: false,
      details: [
        { label: "Material", value: "Ceramic" },
        { label: "Capacity", value: "12 oz" },
      ],
      categoryIds: [],
    };

    mockCreate.mockResolvedValue({ id: "new-merch", ...input });

    const result = await createProduct(input);

    expect(result.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Heritage Mug",
          type: ProductType.MERCH,
          roastLevel: null,
        }),
      })
    );
  });

  it("should return error for invalid input (missing required fields)", async () => {
    const input = {
      productType: ProductType.COFFEE,
      name: "",
      slug: "",
      roastLevel: RoastLevel.MEDIUM,
      origin: [],
    };

    const result = await createProduct(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Name is required");
    }
  });
});

describe("updateProduct", () => {
  it("should update a coffee product", async () => {
    const input = {
      productType: ProductType.COFFEE,
      name: "Updated Blend",
      slug: "updated-blend",
      heading: null,
      description: null,
      isOrganic: true,
      isFeatured: false,
      isDisabled: false,
      roastLevel: RoastLevel.LIGHT,
      origin: ["Ethiopia"],
      variety: null,
      altitude: null,
      tastingNotes: [],
      processing: null,
      categoryIds: [],
    };

    mockUpdate.mockResolvedValue({ id: "prod-1", slug: "updated-blend" });

    const result = await updateProduct("prod-1", input);

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        data: expect.objectContaining({
          name: "Updated Blend",
          roastLevel: RoastLevel.LIGHT,
        }),
      })
    );
  });
});

describe("deleteProduct", () => {
  it("should delete a product and its category associations", async () => {
    mockDeleteMany.mockResolvedValue({ count: 2 });
    mockDelete.mockResolvedValue({ id: "prod-1" });

    const result = await deleteProduct("prod-1");

    expect(result.ok).toBe(true);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "prod-1" } });
  });

  it("should return error on delete failure", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockDelete.mockRejectedValue(new Error("FK constraint"));

    const result = await deleteProduct("prod-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Failed to delete product");
    }
  });
});
