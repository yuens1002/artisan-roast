/**
 * Tests for submitCancellation server action — no-card variant.
 *
 * PLATFORM_API_URL is a module-level const (evaluated at require time).
 * HOSTED_TRIAL_ID is read from process.env at call time.
 * Each describe group loads the module via jest.isolateModules with the
 * required env state, keeps that state for the duration of the group,
 * and cleans up in afterAll.
 */

// ---------------------------------------------------------------------------
// Shared mock setup (hoisted by Jest before any require calls)
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("@/lib/admin", () => ({
  requireAdmin: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/telemetry", () => ({
  getInstanceId: jest.fn(),
}));

jest.mock("@prisma/client", () => {
  const mockPrisma = { siteSettings: { findUnique: jest.fn() } };
  return { PrismaClient: jest.fn(() => mockPrisma), __mockPrisma: mockPrisma };
});

jest.mock("@/lib/prisma", () => ({
  prisma: jest.requireMock("@prisma/client").__mockPrisma,
}));

// ---------------------------------------------------------------------------
// Group 1: both env vars present
// ---------------------------------------------------------------------------

describe("submitCancellation — no-card variant (env configured)", () => {
  let submitCancellation: (input: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

  beforeAll(() => {
    process.env.PLATFORM_API_URL = "http://localhost:3001";
    process.env.HOSTED_TRIAL_ID = "trial_abc123";
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("../actions") as typeof import("../actions");
      submitCancellation = mod.submitCancellation as typeof submitCancellation;
    });
  });

  afterAll(() => {
    delete process.env.PLATFORM_API_URL;
    delete process.env.HOSTED_TRIAL_ID;
  });

  beforeEach(() => jest.clearAllMocks());

  it("returns success on 200 from platform", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await submitCancellation({ variant: "no-card", reason: "too-expensive" });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/trial/hosted/trial_abc123/cancel",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("maps known error codes to user-friendly messages", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "already_cancelled" }),
    });

    const result = await submitCancellation({ variant: "no-card", reason: "switching" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Your trial has already been cancelled.");
  });

  it("returns fallback message for unknown error codes", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "unknown_code" }),
    });

    const result = await submitCancellation({ variant: "no-card", reason: "too-soon" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Something went wrong — please try again.");
  });

  it("returns error when platform is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));

    const result = await submitCancellation({ variant: "no-card", reason: "missing-features" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not reach the hosting service");
  });

  it("returns validation error for invalid reason", async () => {
    const result = await submitCancellation({ variant: "no-card", reason: "" });

    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Group 2: PLATFORM_API_URL missing
// ---------------------------------------------------------------------------

describe("submitCancellation — no-card variant (PLATFORM_API_URL missing)", () => {
  let submitCancellation: (input: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

  beforeAll(() => {
    delete process.env.PLATFORM_API_URL;
    process.env.HOSTED_TRIAL_ID = "trial_abc123";
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("../actions") as typeof import("../actions");
      submitCancellation = mod.submitCancellation as typeof submitCancellation;
    });
  });

  afterAll(() => {
    delete process.env.HOSTED_TRIAL_ID;
  });

  it("returns config error", async () => {
    const result = await submitCancellation({ variant: "no-card", reason: "too-expensive" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Hosting service not configured");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Group 3: HOSTED_TRIAL_ID missing
// ---------------------------------------------------------------------------

describe("submitCancellation — no-card variant (HOSTED_TRIAL_ID missing)", () => {
  let submitCancellation: (input: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

  beforeAll(() => {
    process.env.PLATFORM_API_URL = "http://localhost:3001";
    delete process.env.HOSTED_TRIAL_ID;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("../actions") as typeof import("../actions");
      submitCancellation = mod.submitCancellation as typeof submitCancellation;
    });
  });

  afterAll(() => {
    delete process.env.PLATFORM_API_URL;
  });

  it("returns config error", async () => {
    const result = await submitCancellation({ variant: "no-card", reason: "too-expensive" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Trial ID not configured");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
