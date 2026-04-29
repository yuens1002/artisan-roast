/**
 * Tests for lib/hosted.ts — IS_HOSTED constant + getTrialStatus() fetcher.
 *
 * Coverage:
 * - AC-TST-1: getTrialStatus() returns parsed JSON on 200
 * - AC-TST-2: getTrialStatus() returns null on 5xx / network error
 * - AC-TST-3: getTrialStatus() returns null when env unset
 * - AC-TST-4: IS_HOSTED reflects env presence
 *
 * Module isolation: lib/hosted.ts evaluates `IS_HOSTED` from process.env at
 * import time. Each test that exercises IS_HOSTED resets the module registry
 * so the constant re-evaluates against the test's env.
 */

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.HOSTED_TRIAL_ID;
  delete process.env.PLATFORM_API_URL;
  delete process.env.MOCK_HOSTED_STATUS;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("IS_HOSTED — AC-TST-4", () => {
  it("is true when HOSTED_TRIAL_ID is set", async () => {
    process.env.HOSTED_TRIAL_ID = "test-trial-id";
    const { IS_HOSTED } = await import("../hosted");
    expect(IS_HOSTED).toBe(true);
  });

  it("is false when HOSTED_TRIAL_ID is unset", async () => {
    const { IS_HOSTED } = await import("../hosted");
    expect(IS_HOSTED).toBe(false);
  });

  it("is false when HOSTED_TRIAL_ID is empty string", async () => {
    process.env.HOSTED_TRIAL_ID = "";
    const { IS_HOSTED } = await import("../hosted");
    expect(IS_HOSTED).toBe(false);
  });
});

describe("getTrialStatus()", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  describe("AC-TST-3 — env unset", () => {
    it("returns null and does not call fetch when HOSTED_TRIAL_ID is unset", async () => {
      process.env.PLATFORM_API_URL = "http://localhost:3001";
      const { getTrialStatus } = await import("../hosted");

      const result = await getTrialStatus();

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns null and does not call fetch when PLATFORM_API_URL is unset", async () => {
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      const { getTrialStatus } = await import("../hosted");

      const result = await getTrialStatus();

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("AC-TST-1 — happy path", () => {
    it("returns parsed JSON and calls correct URL with revalidate", async () => {
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      process.env.PLATFORM_API_URL = "http://localhost:3001";

      const fixture = {
        status: "ACTIVE" as const,
        cardAdded: false,
        daysRemaining: 12,
        daysLimit: 14,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => fixture,
      });

      const { getTrialStatus } = await import("../hosted");
      const result = await getTrialStatus();

      expect(result).toEqual(fixture);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/trial/hosted/test-trial-id/status",
        { next: { revalidate: 60 } }
      );
    });

    it("strips trailing slash from PLATFORM_API_URL when building URL", async () => {
      process.env.HOSTED_TRIAL_ID = "abc";
      process.env.PLATFORM_API_URL = "http://localhost:3001/";

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ACTIVE", cardAdded: false, daysRemaining: 1, daysLimit: 14 }),
      });

      const { getTrialStatus } = await import("../hosted");
      await getTrialStatus();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/trial/hosted/abc/status",
        expect.any(Object)
      );
    });

    it("parses CONVERTED variant with plan + support pools", async () => {
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      process.env.PLATFORM_API_URL = "http://localhost:3001";

      const fixture = {
        status: "CONVERTED" as const,
        plan: {
          name: "House Blend",
          renewsAt: "2026-05-29T00:00:00Z",
          price: 4900,
          currency: "USD",
        },
        support: {
          pools: [
            { slug: "tickets", label: "Priority tickets", limit: 5, used: 0 },
          ],
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => fixture,
      });

      const { getTrialStatus } = await import("../hosted");
      const result = await getTrialStatus();

      expect(result).toEqual(fixture);
    });
  });

  describe("AC-TST-2 — error paths", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("returns null on 5xx response without throwing", async () => {
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      process.env.PLATFORM_API_URL = "http://localhost:3001";

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { getTrialStatus } = await import("../hosted");
      const result = await getTrialStatus();

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("returns null on 4xx response without throwing", async () => {
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      process.env.PLATFORM_API_URL = "http://localhost:3001";

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const { getTrialStatus } = await import("../hosted");
      const result = await getTrialStatus();

      expect(result).toBeNull();
    });

    it("returns null on network error without throwing", async () => {
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      process.env.PLATFORM_API_URL = "http://localhost:3001";

      mockFetch.mockRejectedValue(new Error("network down"));

      const { getTrialStatus } = await import("../hosted");
      const result = await getTrialStatus();

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("returns the fixture and skips fetch when MOCK_HOSTED_STATUS is set", async () => {
      process.env.MOCK_HOSTED_STATUS = "ACTIVE_NO_CARD";
      // No HOSTED_TRIAL_ID / PLATFORM_API_URL set — mock should still resolve.

      const { getTrialStatus } = await import("../hosted");
      const result = await getTrialStatus();

      expect(result).toMatchObject({
        status: "ACTIVE",
        cardAdded: false,
        daysLimit: 14,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("ignores MOCK_HOSTED_STATUS when value is unrecognized", async () => {
      process.env.MOCK_HOSTED_STATUS = "BOGUS";
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      process.env.PLATFORM_API_URL = "http://localhost:3001";

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ACTIVE", cardAdded: false, daysRemaining: 1, daysLimit: 14 }),
      });

      const { getTrialStatus } = await import("../hosted");
      await getTrialStatus();

      expect(mockFetch).toHaveBeenCalled();
    });

    it("returns null when JSON parsing fails", async () => {
      process.env.HOSTED_TRIAL_ID = "test-trial-id";
      process.env.PLATFORM_API_URL = "http://localhost:3001";

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("invalid json");
        },
      });

      const { getTrialStatus } = await import("../hosted");
      const result = await getTrialStatus();

      expect(result).toBeNull();
    });
  });
});
