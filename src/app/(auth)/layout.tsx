export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Decorative panel (desktop) ── */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-teal-950 dark:from-teal-950 dark:via-teal-900 dark:to-slate-950">
        {/* Floating network nodes */}
        <div
          className="absolute top-16 right-20 h-48 w-48 rounded-full bg-white/[0.07] animate-float"
        />
        <div
          className="absolute bottom-32 left-12 h-32 w-32 rounded-full bg-white/[0.05] animate-float-slow"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-[45%] right-[30%] h-16 w-16 rounded-full bg-teal-400/20 animate-float"
          style={{ animationDelay: "4s" }}
        />
        <div
          className="absolute top-[25%] left-[22%] h-24 w-24 rounded-full bg-white/[0.04] animate-float-slow"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute bottom-[25%] right-16 h-10 w-10 rounded-full bg-teal-300/15 animate-pulse-soft" />

        {/* Connection lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <line x1="20%" y1="15%" x2="65%" y2="35%" stroke="white" strokeWidth="1" />
          <line x1="65%" y1="35%" x2="40%" y2="60%" stroke="white" strokeWidth="1" />
          <line x1="40%" y1="60%" x2="80%" y2="80%" stroke="white" strokeWidth="1" />
          <line x1="15%" y1="50%" x2="40%" y2="60%" stroke="white" strokeWidth="1" />
          <line x1="78%" y1="18%" x2="65%" y2="35%" stroke="white" strokeWidth="1" />
        </svg>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <h2 className="font-display text-4xl font-semibold text-white tracking-tight">
              Peer Connect
            </h2>
            <p className="mt-2 text-teal-200/70 text-lg">
              Learn together, grow together
            </p>
          </div>

          <div className="max-w-sm">
            <blockquote className="text-xl italic text-white/80 leading-relaxed font-display">
              &ldquo;The best way to learn is to teach.&rdquo;
            </blockquote>
            <p className="mt-3 text-sm text-teal-200/50">
              Frank Oppenheimer
            </p>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        {/* Mobile brand */}
        <div className="lg:hidden mb-8 text-center animate-fade-in">
          <h2 className="font-display text-2xl font-semibold text-foreground tracking-tight">
            Peer<span className="text-primary">Connect</span>
          </h2>
        </div>

        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
