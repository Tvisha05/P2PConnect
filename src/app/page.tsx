import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const features = [
  {
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: "Post Your Doubts",
    description:
      "Share your academic questions with the community. Tag them by subject and set urgency levels.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Real-time Help",
    description:
      "Connect with knowledgeable peers through live chat. Get answers the moment you need them.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Earn Recognition",
    description:
      "Build karma by helping others. Climb the leaderboard and establish your expertise.",
  },
];

const steps = [
  {
    number: "01",
    title: "Describe Your Doubt",
    description:
      "Write out your question, pick a category, add relevant tags, and set how urgently you need help.",
  },
  {
    number: "02",
    title: "Get Matched",
    description:
      "A peer with the right knowledge claims your doubt and opens a real-time conversation with you.",
  },
  {
    number: "03",
    title: "Learn Together",
    description:
      "Collaborate through chat, share files, and work through the problem until it clicks.",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect(session.user.profileComplete ? "/doubts/new" : "/profile/setup");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-foreground tracking-tight"
          >
            Peer<span className="text-primary">Connect</span>
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href="/feed"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
              >
                Browse Doubts
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-24 px-6">
        <div className="mx-auto max-w-4xl text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Peer-to-peer academic help
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold text-foreground leading-[1.1] tracking-tight">
            Where Students{" "}
            <span className="text-primary">Help</span> Students
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Post your academic doubts, get matched with knowledgeable peers,
            and collaborate in real-time. Learning is better together.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={session ? "/feed" : "/register"}
              className="w-full sm:w-auto rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
            >
              {session ? "Browse Doubts" : "Start Learning"}
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto rounded-xl border border-border px-8 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-all"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/[0.06] blur-[100px]" />
          <div className="absolute bottom-0 right-[-10%] h-[300px] w-[400px] rounded-full bg-accent/[0.04] blur-[80px]" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              Everything you need to learn better
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              A complete platform built around how students actually study and
              collaborate.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/40">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              How it works
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Three simple steps from question to understanding.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center md:text-left">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px bg-border" />
                )}
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary font-display text-xl font-bold mb-5 mx-auto md:mx-0">
                  {step.number}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            Ready to learn together?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            {session
              ? "Post a doubt or help a peer today."
              : "Join Peer Connect and turn your questions into understanding."}
          </p>
          <Link
            href={session ? "/doubts/new" : "/register"}
            className="inline-block mt-8 rounded-xl bg-primary px-10 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
          >
            {session ? "Post a Doubt" : "Create Free Account"}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-display text-lg font-semibold text-foreground tracking-tight">
            Peer<span className="text-primary">Connect</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Peer Connect. Built for
            students, by students.
          </p>
        </div>
      </footer>
    </div>
  );
}
