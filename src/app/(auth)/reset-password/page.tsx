import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Reset Password — Peer Connect",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="animate-slide-up bg-card rounded-2xl border border-border shadow-xl shadow-black/[0.03] dark:shadow-black/30 p-8 sm:p-10 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-5 bg-destructive/10">
          <svg
            className="h-7 w-7 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
          Invalid link
        </h1>
        <p className="text-muted-foreground mt-2">
          This reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block mt-8 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
