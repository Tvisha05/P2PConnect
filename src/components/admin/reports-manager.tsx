"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Report = {
  id: string; reason: string; status: string; targetType: string;
  adminNotes: string | null; createdAt: string;
  reporter: { id: string; name: string | null };
  targetUser: { id: string; name: string | null } | null;
  doubt: { id: string; title: string } | null;
};

const STATUS_OPTIONS = ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const;
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  REVIEWED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  RESOLVED: "bg-success/10 text-success",
  DISMISSED: "bg-muted text-muted-foreground",
};

export function ReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<string>("RESOLVED");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports?status=${statusFilter}&page=${page}`)
      .then((r) => r.json())
      .then((d) => { setReports(d.reports ?? []); setTotalPages(d.totalPages ?? 1); })
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  const openReport = (r: Report) => {
    setExpanded(r.id);
    setEditNotes(r.adminNotes ?? "");
    setEditStatus("RESOLVED");
  };

  const saveReport = async (id: string) => {
    setSaving(true);
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: editStatus, adminNotes: editNotes }),
    });
    setSaving(false);
    setExpanded(null);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: editStatus, adminNotes: editNotes } : r));
  };

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-16" />
        ))}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No {statusFilter.toLowerCase()} reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[r.status])}>{r.status}</span>
                    <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">{r.targetType}</span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground mt-1">
                    <span className="font-medium">{r.reporter.name}</span> reported:{" "}
                    {r.doubt ? `"${r.doubt.title}"` : r.targetUser?.name ?? "unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.reason}</p>
                </div>
                <button onClick={() => openReport(r)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors">
                  Review
                </button>
              </div>

              {expanded === r.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <p className="text-sm font-medium text-foreground">Full reason:</p>
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Admin Notes</label>
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                      className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {STATUS_OPTIONS.filter((s) => s !== "PENDING").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button onClick={() => saveReport(r.id)} disabled={saving}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setExpanded(null)}
                      className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-muted transition-colors">←</button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-muted transition-colors">→</button>
        </div>
      )}
    </div>
  );
}
