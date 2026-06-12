/**
 * Tests for startAlaCarteCheckout server action
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRequireAdmin = jest.fn().mockResolvedValue(undefined);
const mockGetInstanceId = jest.fn().mockResolvedValue("inst_abc123");
const mockFetch = jest.fn();

jest.mock("@/lib/admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

jest.mock("@/lib/telemetry", () => ({
  getInstanceId: (...args: unknown[]) => mockGetInstanceId(...args),
}));

jest.mock("@prisma/client", () => {
  const mockPrisma = {
    siteSettings: {
      findUnique: jest.fn().mockResolvedValue({ value: "shop@test.com" }),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma), __mockPrisma: mockPrisma };
});

jest.mock("@/lib/prisma", () => ({
  prisma: jest.requireMock("@prisma/client").__mockPrisma,
}));

// Replace global fetch
global.fetch = mockFetch;

import { startAlaCarteCheckout } from "../actions";
import { ALACARTE_SCENARIOS } from "artisan-roast-sdk/alacarte";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(alaCarteSlug: string): FormData {
  const fd = new FormData();
  fd.set("alaCarteSlug", alaCarteSlug);
  return fd;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("startAlaCarteCheckout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error when platform responds with 500", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    const result = await startAlaCarteCheckout(makeFormData(ALACARTE_SCENARIOS.TICKETS_5.id));

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.url).toBeUndefined();
  });

  it("returns fallback error message on 500 with empty body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(""),
    });

    const result = await startAlaCarteCheckout(makeFormData(ALACARTE_SCENARIOS.TICKETS_5.id));

    expect(result.success).toBe(false);
    expect(result.error).toBe("Checkout failed");
  });

  it("returns error when fetch throws (network failure)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));

    const result = await startAlaCarteCheckout(makeFormData(ALACARTE_SCENARIOS.TICKETS_5.id));

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to start checkout");
  });

  it("returns success with URL when platform responds 200", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }),
    });

    const result = await startAlaCarteCheckout(makeFormData(ALACARTE_SCENARIOS.TICKETS_5.id));

    expect(result.success).toBe(true);
    expect(result.url).toBe("https://checkout.stripe.com/test");
  });

  it("returns error for empty alaCarteSlug", async () => {
    const result = await startAlaCarteCheckout(makeFormData(""));

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid package");
    expect(mockFetch).not.toHaveBeenCalled();
  });

});
