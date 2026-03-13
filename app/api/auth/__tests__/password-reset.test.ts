// Mock Resend before importing anything that uses it
const mockResendClient = {
  emails: {
    send: jest.fn(),
  },
};
jest.mock("@/lib/services/resend", () => ({
  getResend: () => mockResendClient,
}));

// Mock react-email render
jest.mock("@react-email/render", () => ({
  render: jest.fn(async () => "<html>Mock Email</html>"),
}));

// Mock the email component as a React component
jest.mock("@/emails/PasswordResetEmail", () => ({
  __esModule: true,
  default: jest.fn((_props: unknown) => null), // Mock component
}));

// Mock prisma before importing services
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    siteSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    session: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock password utilities
jest.mock("@/lib/password", () => ({
  isStrongPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import { createHash } from "crypto";
import {
  requestPasswordReset,
  resetPasswordWithToken,
  RESET_EXPIRY_MINUTES,
} from "@/lib/password-reset";
import * as passwordLib from "@/lib/password";
import { prisma } from "@/lib/prisma";

const mockResend = mockResendClient;
const mockPasswordLib = passwordLib as jest.Mocked<typeof passwordLib>;

describe("Password Reset Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requestPasswordReset", () => {
    it("should return success when user email exists and has password", async () => {
      const testEmail = "user@example.com";
      const testUserId = "test-user-id";

      // Mock user found
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: testUserId,
        email: testEmail,
        passwordHash: "some-hash",
        name: "Test User",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
      });

      // Mock token deletion
      (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce(
        { count: 0 }
      );

      // Mock token creation
      (prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({
        id: "token-id",
        userId: testUserId,
        tokenHash: "hash",
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      // Mock settings fetch
      (prisma.siteSettings.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock email send
      (mockResend.emails.send as jest.Mock).mockResolvedValueOnce({
        id: "email-id",
      });

      const result = await requestPasswordReset(testEmail);

      expect(result).toEqual({ ok: true });
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
    });

    it("should return success (not leak user existence) when user does not exist", async () => {
      // Mock user not found
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await requestPasswordReset("nonexistent@example.com");

      expect(result).toEqual({ ok: true });
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockResend.emails.send).not.toHaveBeenCalled();
    });

    it("should return success when user has no password hash (OAuth only)", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "oauth-user",
        email: "oauth@example.com",
        passwordHash: null, // No password for OAuth user
        name: "OAuth User",
        emailVerified: new Date(),
        image: "http://example.com/pic.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
      });

      const result = await requestPasswordReset("oauth@example.com");

      expect(result).toEqual({ ok: true });
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it("should delete existing tokens before creating new one", async () => {
      const testUserId = "test-user-id";

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: testUserId,
        email: "user@example.com",
        passwordHash: "hash",
        name: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
      });

      (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce(
        { count: 2 }
      );

      (prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({
        id: "new-token-id",
        userId: testUserId,
        tokenHash: "new-hash",
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      (prisma.siteSettings.findUnique as jest.Mock).mockResolvedValue(null);
      (mockResend.emails.send as jest.Mock).mockResolvedValueOnce({
        id: "email-id",
      });

      await requestPasswordReset("user@example.com");

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
      });
    });

    it("should return ok without crashing when RESEND_API_KEY is not set", async () => {
      const testUserId = "test-user-id";

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: testUserId,
        email: "user@example.com",
        passwordHash: "hash",
        name: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
      });

      (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce(
        { count: 0 }
      );

      (prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({
        id: "token-id",
        userId: testUserId,
        tokenHash: "hash",
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      (prisma.siteSettings.findUnique as jest.Mock).mockResolvedValue(null);

      // Temporarily override getResend() to return null (no RESEND_API_KEY)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const resendModule = require("@/lib/services/resend") as { getResend: jest.Mock };
      const spy = jest.spyOn(resendModule, "getResend").mockReturnValue(null);

      try {
        const result = await requestPasswordReset("user@example.com");

        expect(result).toEqual({ ok: true });
        expect(mockResendClient.emails.send).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it("should create token with correct expiry time", async () => {
      const testUserId = "test-user-id";

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: testUserId,
        email: "user@example.com",
        passwordHash: "hash",
        name: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
      });

      (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce(
        { count: 0 }
      );

      let capturedCreateData: Record<string, unknown> | undefined;
      (prisma.passwordResetToken.create as jest.Mock).mockImplementationOnce(
        async ({ data }: { data: Record<string, unknown> }) => {
          capturedCreateData = data;
          return {
            id: "token-id",
            userId: testUserId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
            consumedAt: null,
            createdAt: new Date(),
          };
        }
      );

      (prisma.siteSettings.findUnique as jest.Mock).mockResolvedValue(null);
      (mockResend.emails.send as jest.Mock).mockResolvedValueOnce({
        id: "email-id",
      });

      const beforeTime = Date.now();
      await requestPasswordReset("user@example.com");
      const afterTime = Date.now();

      const expectedMinTime = beforeTime + RESET_EXPIRY_MINUTES * 60 * 1000;
      const expectedMaxTime = afterTime + RESET_EXPIRY_MINUTES * 60 * 1000;

      expect(capturedCreateData).toBeDefined();
      expect(
        (capturedCreateData!.expiresAt as Date).getTime()
      ).toBeGreaterThanOrEqual(expectedMinTime);
      expect(
        (capturedCreateData!.expiresAt as Date).getTime()
      ).toBeLessThanOrEqual(expectedMaxTime);
    });
  });

  describe("resetPasswordWithToken", () => {
    it("should reject weak passwords", async () => {
      mockPasswordLib.isStrongPassword.mockReturnValueOnce(false);

      const result = await resetPasswordWithToken("some-token", "weak");

      expect(result).toEqual({
        ok: false,
        error: "Password does not meet requirements",
      });
      expect(prisma.passwordResetToken.findFirst).not.toHaveBeenCalled();
    });

    it("should reject invalid or expired tokens", async () => {
      mockPasswordLib.isStrongPassword.mockReturnValueOnce(true);
      (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValueOnce(
        null
      );

      const result = await resetPasswordWithToken(
        "invalid-token",
        "ValidP@ss123"
      );

      expect(result).toEqual({ ok: false, error: "Invalid or expired token" });
    });

    it("should reject token when user not found", async () => {
      mockPasswordLib.isStrongPassword.mockReturnValueOnce(true);
      (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "token-id",
        userId: "user-id",
        tokenHash: "hash",
        expiresAt: new Date(Date.now() + 1000000),
        consumedAt: null,
        createdAt: new Date(),
        user: null, // User not found
      });

      const result = await resetPasswordWithToken("token", "ValidP@ss123");

      expect(result).toEqual({ ok: false, error: "Invalid or expired token" });
    });

    it("should successfully reset password and consume token", async () => {
      const testUserId = "user-id";
      const testToken = "test-token-value";
      const newPassword = "NewP@ss123";
      const newPasswordHash = "hashed-new-password";

      mockPasswordLib.isStrongPassword.mockReturnValueOnce(true);
      mockPasswordLib.hashPassword.mockResolvedValueOnce(newPasswordHash);

      (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "token-id",
        userId: testUserId,
        tokenHash: "token-hash",
        expiresAt: new Date(Date.now() + 1000000),
        consumedAt: null,
        createdAt: new Date(),
        user: {
          id: testUserId,
          email: "user@example.com",
          passwordHash: "old-hash",
          name: null,
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isAdmin: false,
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([
        { id: testUserId, passwordHash: newPasswordHash }, // user update result
        { id: "token-id", consumedAt: new Date() }, // token consumed result
        { count: 0 }, // other tokens deleted
        { count: 0 }, // sessions deleted
      ]);

      const result = await resetPasswordWithToken(testToken, newPassword);

      expect(result).toEqual({ ok: true });
      expect(mockPasswordLib.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should hash token correctly for lookup", async () => {
      const testToken = "test-token";

      mockPasswordLib.isStrongPassword.mockReturnValueOnce(true);
      (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValueOnce(
        null
      );

      await resetPasswordWithToken(testToken, "ValidP@ss123");

      // Verify token was hashed
      const expectedHash = createHash("sha256").update(testToken).digest("hex");
      expect(prisma.passwordResetToken.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tokenHash: expectedHash,
          }),
        })
      );
    });
  });
});
