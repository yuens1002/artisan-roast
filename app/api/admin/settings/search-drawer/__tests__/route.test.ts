/** @jest-environment node */

import { GET, PUT } from "../route";

const requireAdminApiMock = jest.fn();
const findManyMock = jest.fn();
const upsertMock = jest.fn();

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/admin", () => ({
  requireAdminApi: () => requireAdminApiMock(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    siteSettings: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
    },
  },
}));

beforeEach(() => {
  requireAdminApiMock.mockReset();
  findManyMock.mockReset();
  upsertMock.mockReset();
  requireAdminApiMock.mockResolvedValue({ authorized: true });
});

describe("GET /api/admin/settings/search-drawer", () => {
  it("returns 401 when not authorized", async () => {
    requireAdminApiMock.mockResolvedValue({
      authorized: false,
      error: "Unauthorized",
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns nulls when no SiteSettings rows exist", async () => {
    findManyMock.mockResolvedValue([]);
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.chipLabelId).toBeNull();
    expect(data.curatedCategorySlug).toBeNull();
  });

  it("returns stored values when rows exist", async () => {
    findManyMock.mockResolvedValue([
      { key: "search_drawer_chip_label", value: "label-id-123" },
      { key: "search_drawer_curated_category", value: "staff-picks" },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data.chipLabelId).toBe("label-id-123");
    expect(data.curatedCategorySlug).toBe("staff-picks");
  });

  it("returns empty string for explicitly-cleared curatedCategorySlug", async () => {
    findManyMock.mockResolvedValue([
      { key: "search_drawer_curated_category", value: "" },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data.curatedCategorySlug).toBe("");
  });
});

describe("PUT /api/admin/settings/search-drawer", () => {
  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/admin/settings/search-drawer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    findManyMock.mockResolvedValue([]);
    upsertMock.mockResolvedValue({});
  });

  it("returns 401 when not authorized", async () => {
    requireAdminApiMock.mockResolvedValue({
      authorized: false,
      error: "Unauthorized",
    });
    const res = await PUT(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("rejects empty body (no fields) with 400", async () => {
    const res = await PUT(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects empty chipLabelId with 400", async () => {
    const res = await PUT(makeRequest({ chipLabelId: "" }));
    expect(res.status).toBe(400);
  });

  it("persists chipLabelId only (partial update)", async () => {
    const res = await PUT(makeRequest({ chipLabelId: "label-id-123" }));
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [call] = upsertMock.mock.calls[0];
    expect(call.where.key).toBe("search_drawer_chip_label");
    expect(call.update.value).toBe("label-id-123");
  });

  it("persists curatedCategorySlug only (partial update)", async () => {
    const res = await PUT(makeRequest({ curatedCategorySlug: "staff-picks" }));
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [call] = upsertMock.mock.calls[0];
    expect(call.where.key).toBe("search_drawer_curated_category");
    expect(call.update.value).toBe("staff-picks");
  });

  it("persists both fields when provided", async () => {
    const res = await PUT(
      makeRequest({
        chipLabelId: "label-id-123",
        curatedCategorySlug: "staff-picks",
      })
    );
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(2);
  });

  it("accepts empty-string curatedCategorySlug (admin clears it)", async () => {
    const res = await PUT(makeRequest({ curatedCategorySlug: "" }));
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [call] = upsertMock.mock.calls[0];
    expect(call.update.value).toBe("");
  });
});
