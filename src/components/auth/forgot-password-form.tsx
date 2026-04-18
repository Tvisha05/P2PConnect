"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  forgotPasswordAction,
  type ActionState,
} from "@/app/(auth)/actions";

const initialState: ActionState = { error: "", success: "" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState
  );

  return (
    <div className="animate-slide-up bg-card rounded-2xl border border-border shadow-xl shadow-black/[0.03] dark:shadow-black/30 p-8 sm:p-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
          Forgot password
        </h1>
        <p className="text-muted-foreground mt-2">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {state.error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-4 mb-6 border border-destructive/20">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="bg-success/10 text-success text-sm rounded-xl p-4 mb-6 border border-success/20">
          {state.success}
        </div>
      )}

      {!state.success && (
        <form action={formAction} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
          >
            {pending ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground mt-8">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
