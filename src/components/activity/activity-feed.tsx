"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ActivityEvent =
  | { type: "karma"; id: string; delta: number; reason: string; createdAt: string }
  | { type: "posted"; id: string; doubtId: string; title: string; status: string; createdAt: string }
  | { type: "helped"; id: string; doubtId: string; title: string; status: string; createdAt: string };

function monthLabel(isoDate: string) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function groupByMonth(events: ActivityEvent[]) {
  const groups: { label: string; events: ActivityEvent[] }[] = [];
  for (const event of events) {
    const label = monthLabel(event.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }
  return groups;
}

function KarmaIcon({ delta }: { delta: number }) {
  return (
    <div
      className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
        delta >= 0
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      ✦
    </div>
  );
}

function PostedIcon() {
  return (
    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center text-sm shrink-0">
      📝
    </div>
  );
}

function HelpedIcon() {
  return (
    <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center text-sm shrink-0">
      🤝
    </div>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  if (event.type === "karma") {
    return (
      <div className="flex items-center gap-3 py-3">
        <KarmaIcon delta={event.delta} />
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "text-sm font-semibold",
              event.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {event.delta >= 0 ? `+${event.delta}` : event.delta} karma
          </span>
          <span className="text-sm text-muted-foreground ml-2">{event.reason}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(event.createdAt)}</span>
      </div>
    );
  }

  if (event.type === "posted") {
    return (
      <Link
        href={`/doubts/${event.doubtId}`}
        className="flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg -mx-2 px-2 transition-colors"
      >
        <PostedIcon />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Posted</span>
          <p className="text-sm text-foreground truncate">{event.title}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(event.createdAt)}</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/doubts/${event.doubtId}`}
      className="flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg -mx-2 px-2 transition-colors"
    >
      <HelpedIcon />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Helped</span>
        <p className="text-sm text-foreground truncate">{event.title}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(event.createdAt)}</span>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-muted animate-pulse rounded w-48" />
        <div className="h-3 bg-muted animate-pulse rounded w-32" />
      </div>
      <div className="h-3 bg-muted animate-pulse rounded w-12 shrink-0" />
    </div>
  );
}

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm divide-y divide-border/50">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Failed to load activity. Please refresh.
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground text-sm">
          No activity yet — post a doubt or help someone to get started.
        </p>
      </div>
    );
  }

  const groups = groupByMonth(events);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="rounded-2xl border border-border bg-card px-5 divide-y divide-border/50">
            {group.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
