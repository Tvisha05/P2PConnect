import Link from "next/link";

const footerLinks = [
  { label: "Feed", href: "/feed" },
  { label: "Tags", href: "/tags" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Link
              href="/"
              className="font-display text-lg font-semibold text-foreground tracking-tight"
            >
              Peer<span className="text-primary">Connect</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              Peer-to-peer academic doubt resolution.
            </p>
          </div>
          <div className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} Peer Connect. Built for students,
            by students.
          </p>
        </div>
      </div>
    </footer>
  );
}
