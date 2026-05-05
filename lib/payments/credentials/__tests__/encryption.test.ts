import { encryptWithKey, decryptWithKey, isEncryptionKeySet } from "../encryption";

const KEY_HEX = "a".repeat(64); // 64 hex chars = 32 bytes
const testKey = Buffer.from(KEY_HEX, "hex");
const otherKey = Buffer.from("b".repeat(64), "hex");

function withEnvKey(key: string | undefined, fn: () => void) {
  const original = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (key === undefined) {
    delete process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  } else {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = key;
  }
  try {
    fn();
  } finally {
    if (original === undefined) {
      delete process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
    } else {
      process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = original;
    }
  }
}

describe("encryptWithKey / decryptWithKey", () => {
  it("round-trips a plaintext string", () => {
    const plaintext = "sk_test_abc123";
    const envelope = encryptWithKey(plaintext, testKey);
    expect(decryptWithKey(envelope, testKey)).toBe(plaintext);
  });

  it("produces a versioned v1 envelope", () => {
    const envelope = encryptWithKey("hello", testKey);
    expect(envelope).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  });

  it("generates unique ciphertext each call (random IV)", () => {
    const a = encryptWithKey("same", testKey);
    const b = encryptWithKey("same", testKey);
    expect(a).not.toBe(b);
    expect(decryptWithKey(a, testKey)).toBe("same");
    expect(decryptWithKey(b, testKey)).toBe("same");
  });

  it("throws on tampered ciphertext", () => {
    const envelope = encryptWithKey("secret", testKey);
    const parts = envelope.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptWithKey(parts.join(":"), testKey)).toThrow();
  });

  it("throws on tampered auth tag", () => {
    const envelope = encryptWithKey("secret", testKey);
    const parts = envelope.split(":");
    parts[2] = Buffer.from("badtag000000000000").toString("base64");
    expect(() => decryptWithKey(parts.join(":"), testKey)).toThrow();
  });

  it("throws when decrypting with the wrong key", () => {
    const envelope = encryptWithKey("secret", testKey);
    expect(() => decryptWithKey(envelope, otherKey)).toThrow();
  });

  it("throws on malformed envelope (missing parts)", () => {
    expect(() => decryptWithKey("v1:onlytwoparts", testKey)).toThrow(
      "Invalid encryption envelope"
    );
  });

  it("throws on unknown version prefix", () => {
    const envelope = encryptWithKey("x", testKey).replace(/^v1:/, "v2:");
    expect(() => decryptWithKey(envelope, testKey)).toThrow("Unsupported encryption version");
  });
});

describe("isEncryptionKeySet", () => {
  it("returns true when key is set", () => {
    withEnvKey(KEY_HEX, () => {
      expect(isEncryptionKeySet()).toBe(true);
    });
  });

  it("returns false when key is absent", () => {
    withEnvKey(undefined, () => {
      expect(isEncryptionKeySet()).toBe(false);
    });
  });
});
