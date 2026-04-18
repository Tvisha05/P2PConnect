"use server";

import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators";
import { sendEmail, emailColors } from "@/lib/email";

export type ActionState = {
  error: string;
  success: string;
};

// ─── Register ───────────────────────────────────────────

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message, success: "" };
  }

  const { name, email, password } = result.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Email already registered", success: "" };
    }

    const passwordHash = await hash(password, 12);

    // No email verification: mark verified immediately.
    await prisma.user.create({
      data: { name, email, passwordHash, emailVerified: new Date() },
    });

    return {
      error: "",
      success:
        "Registration successful. You can now sign in.",
    };
  } catch {
    return { error: "Something went wrong. Please try again.", success: "" };
  }
}

// ─── Forgot Password ────────────────────────────────────

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message, success: "" };
  }

  const { email } = result.data;
  const successMsg =
    "If an account with that email exists, a reset link has been sent.";

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { error: "", success: successMsg };
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: { identifier: `reset:${email}` },
      });
      await tx.verificationToken.create({
        data: { identifier: `reset:${email}`, token, expires },
      });
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    try {
      await sendEmail({
        to: email,
        subject: "Reset your password — Peer Connect",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: ${emailColors.primary};">Password Reset</h2>
            <p>Hi ${user.name ?? "there"},</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; background: ${emailColors.primary}; color: ${emailColors.primaryForeground}; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Reset Password</a>
            <p style="color: ${emailColors.muted}; font-size: 14px; margin-top: 24px;">Or copy this link: ${resetUrl}</p>
            <p style="color: ${emailColors.muted}; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Failed to send password reset email:", e);
    }

    return { error: "", success: successMsg };
  } catch {
    return { error: "Something went wrong. Please try again.", success: "" };
  }
}

// ─── Reset Password ─────────────────────────────────────

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message, success: "" };
  }

  const { token, password } = result.data;

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (
      !verificationToken ||
      !verificationToken.identifier.startsWith("reset:")
    ) {
      return { error: "Invalid or expired token.", success: "" };
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token,
          },
        },
      });
      return {
        error: "Token has expired. Please request a new reset link.",
        success: "",
      };
    }

    const email = verificationToken.identifier.replace("reset:", "");
    const passwordHash = await hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { email }, data: { passwordHash } }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token,
          },
        },
      }),
    ]);

    return {
      error: "",
      success: "Password reset successfully. You can now sign in.",
    };
  } catch {
    return { error: "Something went wrong. Please try again.", success: "" };
  }
}
