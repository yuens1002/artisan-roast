"use server";

import { z, ZodIssue } from "zod";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/password-reset";
import { isStrongPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

// --- Demo sign-in (credentials stay server-side) ---

const DEMO_CREDENTIALS = {
  admin: {
    email: "admin@artisanroast.com",
    password: "ivcF8ZV3FnGaBJ&#8j",
    redirectTo: "/admin",
  },
  customer: {
    email: "demo@artisanroast.com",
    password: "ixcF8ZV3FnGaBJ&#8j",
    redirectTo: "/",
  },
} as const;

type DemoAccountType = keyof typeof DEMO_CREDENTIALS;

export async function demoSignIn(
  accountType: string
): Promise<{ error?: string }> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return { error: "Demo mode is not enabled" };
  }

  if (accountType !== "admin" && accountType !== "customer") {
    return { error: "Invalid account type" };
  }

  const account = DEMO_CREDENTIALS[accountType as DemoAccountType];

  try {
    await signIn("credentials", {
      email: account.email,
      password: account.password,
      redirectTo: account.redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Demo sign-in failed. Please try again." };
    }
    // Next.js redirects are thrown as errors — rethrow
    throw error;
  }

  return { error: "Something went wrong" };
}

// Validation schemas
const credentialsSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid password"),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "Invalid token"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "password should match",
  });

export async function signInAdmin(
  prevState: unknown,
  formData: FormData
): Promise<{
  message?: string;
  emailError?: string;
  passwordError?: string;
  email?: string;
}> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const validated = credentialsSchema.safeParse({ email, password });
    if (!validated.success) {
      const errors: { emailError?: string; passwordError?: string } = {};
      validated.error.issues.forEach((e: ZodIssue) => {
        if (e.path[0] === "email") {
          errors.emailError = e.message;
        } else if (e.path[0] === "password") {
          errors.passwordError = e.message;
        }
      });
      return {
        ...errors,
        email: String(email || ""),
      };
    }

    await signIn("credentials", {
      email: validated.data.email,
      password: validated.data.password,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Invalid credentials", email: String(email || "") };
        default:
          return {
            message: "Something went wrong",
            email: String(email || ""),
          };
      }
    }
    // Next.js redirects are thrown as errors, so we must rethrow them
    throw error;
  }

  return { message: "Something went wrong" };
}

export async function signInPublic(
  prevState: unknown,
  formData: FormData
): Promise<{
  message?: string;
  emailError?: string;
  passwordError?: string;
  email?: string;
}> {
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = (formData.get("redirectTo") as string | null) || "/account";

  try {
    const validated = credentialsSchema.safeParse({ email, password });
    if (!validated.success) {
      const errors: { emailError?: string; passwordError?: string } = {};
      validated.error.issues.forEach((e: ZodIssue) => {
        if (e.path[0] === "email") {
          errors.emailError = e.message;
        } else if (e.path[0] === "password") {
          errors.passwordError = e.message;
        }
      });
      return {
        ...errors,
        email: String(email || ""),
      };
    }

    await signIn("credentials", {
      email: validated.data.email,
      password: validated.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Invalid credentials", email: String(email || "") };
        default:
          return {
            message: "Something went wrong",
            email: String(email || ""),
          };
      }
    }
    // Next.js redirects are thrown as errors, so we must rethrow them
    throw error;
  }

  return { message: "Something went wrong" };
}

export async function requestPasswordResetAction(
  prevState: unknown,
  formData: FormData
): Promise<{ ok?: boolean; error?: string; message?: string }> {
  try {
    const email = (formData.get("email") as string | null)?.trim() ?? "";

    const validated = forgotPasswordSchema.safeParse({ email });
    if (!validated.success) {
      return {
        ok: false,
        error: validated.error.issues
          .map((e: ZodIssue) => e.message)
          .join("; "),
      };
    }

    await requestPasswordReset(validated.data.email);
    return {
      ok: true,
      message: "If that email exists, we sent reset instructions.",
    };
  } catch (error) {
    console.error("requestPasswordResetAction error:", error);
    return {
      ok: false,
      error: "Unable to process password reset request",
    };
  }
}

export async function resetPasswordWithTokenAction(
  prevState: unknown,
  formData: FormData
): Promise<{
  ok?: boolean;
  error?: string;
  message?: string;
  errors?: { password?: string; confirmPassword?: string };
}> {
  try {
    const token = (formData.get("token") as string | null)?.trim() ?? "";
    const password = (formData.get("password") as string | null) ?? "";
    const confirmPassword =
      (formData.get("confirmPassword") as string | null) ?? "";

    const validated = resetPasswordSchema.safeParse({
      token,
      password,
      confirmPassword,
    });
    if (!validated.success) {
      const errors: { password?: string; confirmPassword?: string } = {};
      validated.error.issues.forEach((e: ZodIssue) => {
        if (e.path[0] === "password") errors.password = e.message;
        if (e.path[0] === "confirmPassword") errors.confirmPassword = e.message;
      });
      return {
        ok: false,
        error: validated.error.issues
          .map((e: ZodIssue) => e.message)
          .join("; "),
        errors,
      };
    }

    if (!isStrongPassword(validated.data.password)) {
      return {
        ok: false,
        error: "Password does not meet requirements",
        errors: { password: "Password does not meet requirements" },
      };
    }

    const result = await resetPasswordWithToken(
      validated.data.token,
      validated.data.password
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
      };
    }

    return {
      ok: true,
      message: "Password reset successful",
    };
  } catch (error) {
    console.error("resetPasswordWithTokenAction error:", error);
    return {
      ok: false,
      error: "Unable to reset password",
    };
  }
}

// Signup schema with confirm
const signupSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "password should match",
  });

export async function signUpPublic(
  _prevState: unknown,
  formData: FormData
): Promise<{
  message?: string;
  name?: string;
  email?: string;
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
}> {
  const name = (formData.get("name") as string | null) ?? "";
  const email = (formData.get("email") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const confirmPassword =
    (formData.get("confirmPassword") as string | null) ?? "";
  const redirectTo = (formData.get("redirectTo") as string | null) || "/account";

  const validated = signupSchema.safeParse({
    name: name || undefined,
    email,
    password,
    confirmPassword,
  });

  if (!validated.success) {
    const errors: {
      emailError?: string;
      passwordError?: string;
      confirmPasswordError?: string;
    } = {};
    validated.error.issues.forEach((e: ZodIssue) => {
      if (e.path[0] === "email") errors.emailError = e.message;
      if (e.path[0] === "password") errors.passwordError = e.message;
      if (e.path[0] === "confirmPassword")
        errors.confirmPasswordError = e.message;
    });
    return {
      ...errors,
      name: String(name || ""),
      email: String(email || ""),
    };
  }

  if (!isStrongPassword(validated.data.password)) {
    return {
      passwordError: "Password does not meet requirements",
      name: String(name || ""),
      email: String(email || ""),
    };
  }

  // Ensure unique email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      emailError: "Email already registered",
      name: String(name || ""),
      email: String(email || ""),
    };
  }

  const passwordHash = await hashPassword(validated.data.password);
  await prisma.user.create({
    data: {
      email: validated.data.email,
      name: validated.data.name || null,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", {
      email: validated.data.email,
      password: validated.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        message:
          "Account created but sign-in failed. Please try signing in manually.",
        name: String(name || ""),
        email: String(email || ""),
      };
    }
    throw error;
  }

  return { message: "Something went wrong" };
}
