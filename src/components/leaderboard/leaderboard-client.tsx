"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { LeaderboardPeriod } from "@/types";

type Entry = {
  userId: string; name: string | null; image: string | null;
  karma: number; department: string | null; rank: number;
};

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "monthly", label: "This Month" },
  { value: "weekly", label: "This Week" },
];

const DEPT_LABELS: Record<string, string> = {
  CSE: "CSE", ECE: "ECE", EEE: "EEE", ME: "ME", CE: "CE",
  IT: "IT", AI_ML: "AI/ML", DS: "DS", CIVIL: "Civil", OTHER: "Other",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardClient() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}&page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotalPages(data.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [period, page]);

  const switchPeriod = (p: LeaderboardPeriod) => {
    setPeriod(p);
    setPage(1);
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => switchPeriod(p.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
              period === p.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No data for this period yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {entries.map((entry, i) => (
            <Link
              key={entry.userId}
              href={`/users/${entry.userId}`}
              className={cn(
                "flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors",
                i !== entries.length - 1 && "border-b border-border"
              )}
            >
              <div className="w-8 text-center shrink-0">
                {entry.rank <= 3 ? (
                  <span className="text-lg">{MEDALS[entry.rank - 1]}</span>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    #{entry.rank}
                  </span>
                )}
              </div>

              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                {entry.department && (
                  <p className="text-xs text-muted-foreground">
                    {DEPT_LABELS[entry.department] ?? entry.department}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{entry.karma}</p>
                <p className="text-xs text-muted-foreground">karma</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
