import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "Verify Email — Peer Connect",
};

type Result = {
  status: "success" | "error";
  title: string;
  message: string;
  linkHref: string;
  linkText: string;
};

async function verifyToken(token: string): Promise<Result> {
  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return {
        status: "error",
        title: "Verification failed",
        message: "Invalid or expired verification link.",
        linkHref: "/register",
        linkText: "Register again",
      };
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
        status: "error",
        title: "Link expired",
        message: "This verification link has expired. Please register again.",
        linkHref: "/register",
        linkText: "Register again",
      };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verificationToken.identifier },
        data: { emailVerified: new Date() },
      }),
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
      status: "success",
      title: "Email verified!",
      message: "Your email has been verified. You can now sign in.",
      linkHref: "/login",
      linkText: "Sign in",
    };
  } catch {
    return {
      status: "error",
      title: "Something went wrong",
      message: "Please try again later.",
      linkHref: "/register",
      linkText: "Register again",
    };
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const result: Result = token
    ? await verifyToken(token)
    : {
        status: "error",
        title: "Invalid link",
        message: "No verification token provided.",
        linkHref: "/register",
        linkText: "Register again",
      };

  return (
    <div className="animate-slide-up bg-card rounded-2xl border border-border shadow-xl shadow-black/[0.03] dark:shadow-black/30 p-8 sm:p-10 text-center">
      <div
        className={`inline-flex items-center justify-center h-14 w-14 rounded-full mb-5 ${
          result.status === "success"
            ? "bg-success/10"
            : "bg-destructive/10"
        }`}
      >
        {result.status === "success" ? (
          <svg
            className="h-7 w-7 text-success"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        ) : (
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
        )}
      </div>
      <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
        {result.title}
      </h1>
      <p className="text-muted-foreground mt-2">{result.message}</p>
      <Link
        href={result.linkHref}
        className="inline-block mt-8 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
      >
        {result.linkText}
      </Link>
    </div>
  );
}
