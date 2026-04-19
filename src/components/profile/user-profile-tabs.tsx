"use client";

import { useState, useEffect } from "react";
import { DoubtCard } from "@/components/doubts/doubt-card";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { DoubtWithRelations } from "@/types";

type Tab = "posted" | "helped";

export function UserProfileTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("posted");
  const [doubts, setDoubts] = useState<DoubtWithRelations[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}/doubts?type=${tab}&page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setDoubts(data.doubts ?? []);
        setTotalPages(data.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [userId, tab, page]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {(["posted", "helped"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "posted" ? "Doubts Posted" : "Doubts Helped"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
              <div className="h-4 w-1/2 rounded bg-muted mb-3" />
              <div className="h-4 w-full rounded bg-muted mb-2" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : doubts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {tab === "posted" ? "No doubts posted yet." : "Hasn't helped on any doubts yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => (
            <DoubtCard key={doubt.id} doubt={doubt} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
