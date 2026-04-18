import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "primary" | "secondary" | "success" | "warning" | "destructive" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-muted-foreground bg-transparent",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    OPEN: { label: "Open", variant: "success" },
    CLAIMED: { label: "Claimed", variant: "warning" },
    IN_PROGRESS: { label: "In Progress", variant: "primary" },
    RESOLVED: { label: "Resolved", variant: "default" },
  };

  const { label, variant } = config[status] ?? { label: status, variant: "default" as BadgeVariant };

  return <Badge variant={variant}>{label}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const config: Record<string, { label: string; className: string }> = {
    LOW: { label: "Low", className: "bg-urgency-low/10 text-urgency-low" },
    MEDIUM: { label: "Medium", className: "bg-urgency-medium/10 text-urgency-medium" },
    HIGH: { label: "High", className: "bg-urgency-high/10 text-urgency-high" },
  };

  const { label, className } = config[urgency] ?? { label: urgency, className: "" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}
