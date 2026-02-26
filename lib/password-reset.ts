import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/services/resend";
import { render } from "@react-email/render";
import { getEmailBranding } from "@/lib/config/app-settings";
import PasswordResetEmail from "@/emails/PasswordResetEmail";
import { hashPassword, isStrongPassword } from "@/lib/password";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const RESET_EXPIRY_MINUTES = 30;

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success-ish to avoid leaking existence
  if (!user || !user.passwordHash) {
    return { ok: true } as const;
  }

  // Clean up existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${APP_URL}/api/auth/password-reset-callback?token=${token}`;

  const [{ storeName, logoUrl }, fromEmailSetting, supportEmailSetting] =
    await Promise.all([
      getEmailBranding(),
      prisma.siteSettings.findUnique({ where: { key: "contactEmail" } }),
      prisma.siteSettings.findUnique({ where: { key: "support_email" } }),
    ]);

  const fromEmail = fromEmailSetting?.value || "onboarding@resend.dev";
  const supportEmail = supportEmailSetting?.value;

  const html = await render(
    PasswordResetEmail({ resetUrl, storeName, logoUrl, supportEmail }),
    { pretty: false }
  );

  await resend.emails.send({
    from: `${storeName} <${fromEmail}>`,
    to: [email],
    subject: `${storeName} password reset instructions`,
    html,
  });

  return { ok: true } as const;
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (!isStrongPassword(password)) {
    return { ok: false, error: "Password does not meet requirements" } as const;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!resetToken || !resetToken.user) {
    return { ok: false, error: "Invalid or expired token" } as const;
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { consumedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId, id: { not: resetToken.id } },
    }),
    prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  return { ok: true } as const;
}
