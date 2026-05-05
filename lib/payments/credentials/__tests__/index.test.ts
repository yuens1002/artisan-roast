import {
  loadStripeCredentials,
  saveStripeCredentials,
  clearStripeCredentials,
  getStripeConfigStatus,
} from "../index";

const TEST_KEY = Buffer.from("a".repeat(64), "hex");

jest.mock("@/lib/prisma", () => ({
  prisma: {
    paymentProcessorConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("../encryption", () => ({
  getOrCreateEncryptionKey: jest.fn().mockResolvedValue(Buffer.from("a".repeat(64), "hex")),
  encryptWithKey: jest.fn((v: string) => `encrypted:${v}`),
  decryptWithKey: jest.fn((v: string) => {
    if (v.startsWith("encrypted:")) return v.replace("encrypted:", "");
    throw new Error("bad ciphertext");
  }),
  isEncryptionKeySet: jest.fn().mockReturnValue(true),
}));

import { prisma } from "@/lib/prisma";
import { encryptWithKey, decryptWithKey } from "../encryption";

const mockFindUnique = prisma.paymentProcessorConfig
  .findUnique as jest.MockedFunction<
  typeof prisma.paymentProcessorConfig.findUnique
>;
const mockUpsert = prisma.paymentProcessorConfig.upsert as jest.MockedFunction<
  typeof prisma.paymentProcessorConfig.upsert
>;
const mockDeleteMany =
  prisma.paymentProcessorConfig.deleteMany as jest.MockedFunction<
    typeof prisma.paymentProcessorConfig.deleteMany
  >;
const mockEncryptWith = encryptWithKey as jest.MockedFunction<typeof encryptWithKey>;
const mockDecryptWith = decryptWithKey as jest.MockedFunction<typeof decryptWithKey>;

// suppress unused variable warning
void mockDecryptWith;
void TEST_KEY;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cfg1",
    processor: "stripe",
    isActive: true,
    secretKey: "encrypted:sk_test_abc",
    webhookSecret: "encrypted:whsec_xyz",
    publishableKey: "pk_test_abc",
    accountId: "acct_123",
    accountName: "Acme Coffee",
    isTestMode: true,
    lastValidatedAt: new Date("2026-04-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadStripeCredentials", () => {
  it("returns null when no row exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await loadStripeCredentials();
    expect(result).toBeNull();
  });

  it("returns null when row exists but secretKey is null", async () => {
    mockFindUnique.mockResolvedValue(makeRow({ secretKey: null }) as never);
    const result = await loadStripeCredentials();
    expect(result).toBeNull();
  });

  it("returns decrypted credentials when row exists", async () => {
    mockFindUnique.mockResolvedValue(makeRow() as never);
    const result = await loadStripeCredentials();
    expect(result).not.toBeNull();
    expect(result?.secretKey).toBe("sk_test_abc");
    expect(result?.webhookSecret).toBe("whsec_xyz");
    expect(result?.publishableKey).toBe("pk_test_abc");
    expect(result?.accountName).toBe("Acme Coffee");
  });

  it("returns null + logs error when decryption fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockFindUnique.mockResolvedValue(
      makeRow({ secretKey: "bad-ciphertext" }) as never
    );
    const result = await loadStripeCredentials();
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to decrypt"),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });
});

describe("saveStripeCredentials", () => {
  it("encrypts secretKey and webhookSecret before upsert", async () => {
    mockUpsert.mockResolvedValue(makeRow() as never);
    await saveStripeCredentials({
      secretKey: "sk_test_new",
      webhookSecret: "whsec_new",
      publishableKey: "pk_test_new",
    });
    expect(mockEncryptWith).toHaveBeenCalledWith("sk_test_new", expect.any(Buffer));
    expect(mockEncryptWith).toHaveBeenCalledWith("whsec_new", expect.any(Buffer));
    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.secretKey).toBe("encrypted:sk_test_new");
    expect(upsertCall.create.webhookSecret).toBe("encrypted:whsec_new");
    expect(upsertCall.create.publishableKey).toBe("pk_test_new");
  });

  it("does NOT encrypt publishableKey", async () => {
    mockUpsert.mockResolvedValue(makeRow() as never);
    await saveStripeCredentials({ publishableKey: "pk_test_plain" });
    expect(mockEncryptWith).not.toHaveBeenCalled();
    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.update.publishableKey).toBe("pk_test_plain");
  });
});

describe("clearStripeCredentials", () => {
  it("deletes the stripe row", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    await clearStripeCredentials();
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { processor: "stripe" },
    });
  });
});

describe("getStripeConfigStatus", () => {
  it("returns hasRow: false when no row", async () => {
    mockFindUnique.mockResolvedValue(null);
    const status = await getStripeConfigStatus();
    expect(status.hasRow).toBe(false);
    expect(status.decryptionError).toBe(false);
  });

  it("returns hasRow: true and correct metadata when row exists", async () => {
    mockFindUnique.mockResolvedValue(makeRow() as never);
    const status = await getStripeConfigStatus();
    expect(status.hasRow).toBe(true);
    expect(status.accountName).toBe("Acme Coffee");
    expect(status.hasSecretKey).toBe(true);
    expect(status.hasWebhookSecret).toBe(true);
    expect(status.decryptionError).toBe(false);
  });

  it("flags decryptionError when stored secretKey can't be decrypted", async () => {
    mockFindUnique.mockResolvedValue(
      makeRow({ secretKey: "bad-ciphertext" }) as never
    );
    const status = await getStripeConfigStatus();
    expect(status.decryptionError).toBe(true);
  });
});
