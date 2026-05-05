/** @jest-environment node */

import { GET } from "../route";

const fullTextSearchIdsMock = jest.fn();
const findManyMock = jest.fn();
const countMock = jest.fn();
const userActivityCreateMock = jest.fn();
const authMock = jest.fn();

jest.mock("@/lib/search/full-text", () => ({
  fullTextSearchIds: (...args: unknown[]) => fullTextSearchIdsMock(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
    },
    userActivity: {
      create: (...args: unknown[]) => userActivityCreateMock(...args),
    },
  },
}));

jest.mock("@/auth", () => ({
  auth: () => authMock(),
}));

beforeEach(() => {
  fullTextSearchIdsMock.mockReset();
  findManyMock.mockReset();
  countMock.mockReset();
  userActivityCreateMock.mockReset();
  authMock.mockReset();
  authMock.mockResolvedValue(null);
});

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/search?q=${encodeURIComponent(query)}`);
}

describe("GET /api/search — type filter", () => {
  it("does NOT filter by type — merch is included in keyword search", async () => {
    fullTextSearchIdsMock.mockResolvedValue([]);
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    await GET(makeRequest("dripper") as never);

    // findMany should be called with where that does NOT specify type
    expect(findManyMock).toHaveBeenCalled();
    const call = findManyMock.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("type");
    expect(call.where.isDisabled).toBe(false);
  });
});

describe("GET /api/search — honest no-results in roast pattern path", () => {
  it("returns empty products when query has tokens after stripping roast but FTS returns 0", async () => {
    fullTextSearchIdsMock.mockResolvedValue([]);
    // findMany should NOT be called (we short-circuit)
    findManyMock.mockResolvedValue([]);

    const res = await GET(makeRequest("light roast asdfghjkl") as never);
    const data = await res.json();

    expect(data.products).toEqual([]);
    expect(data.count).toBe(0);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns ranked products when query within roast matches FTS", async () => {
    fullTextSearchIdsMock.mockResolvedValue(["p1"]);
    findManyMock.mockResolvedValue([
      { id: "p1", name: "X", categories: [], variants: [] },
    ]);

    const res = await GET(makeRequest("light roast ethiopia") as never);
    const data = await res.json();

    expect(data.products).toHaveLength(1);
    expect(data.count).toBe(1);
  });

  it("plain query with FTS-zero falls back to OR (no honest-zero short circuit)", async () => {
    // The honest-no-results short circuit only applies in the roast-pattern
    // branch. For plain queries, the OR fallback (name contains) still runs.
    fullTextSearchIdsMock.mockResolvedValue([]);
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    const res = await GET(makeRequest("xyzzz") as never);
    const data = await res.json();

    expect(data.products).toEqual([]);
    expect(findManyMock).toHaveBeenCalled();
    const call = findManyMock.mock.calls[0][0];
    expect(call.where.OR).toBeDefined();
  });
});
