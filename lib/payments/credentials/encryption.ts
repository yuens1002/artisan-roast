import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = "v1";
const SETTINGS_KEY = "payment_encryption_key";

function parseKey(raw: string): Buffer {
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      `Encryption key must be 32 bytes. Got ${key.length} bytes.`
    );
  }
  return key;
}

export async function getOrCreateEncryptionKey(): Promise<Buffer> {
  const envKey = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (envKey) return parseKey(envKey);

  const setting = await prisma.siteSettings.findUnique({
    where: { key: SETTINGS_KEY },
  });
  if (setting) return parseKey(setting.value);

  const generated = randomBytes(32).toString("hex");
  const result = await prisma.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    update: {},
    create: { key: SETTINGS_KEY, value: generated },
  });
  return parseKey(result.value);
}

export function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptWithKey(envelope: string, key: Buffer): string {
  const parts = envelope.split(":");
  if (parts.length !== 4) {
    throw new Error(
      `Invalid encryption envelope: expected 4 parts, got ${parts.length}`
    );
  }
  const [version, ivB64, authTagB64, ciphertextB64] = parts;
  if (version !== VERSION) {
    throw new Error(
      `Unsupported encryption version: "${version}". Expected "${VERSION}".`
    );
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return (
    decipher.update(ciphertext).toString("utf8") +
    decipher.final().toString("utf8")
  );
}

export function isEncryptionKeySet(): boolean {
  return !!process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
}
