"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

type User = {
  id: string; name: string | null; email: string; role: string;
  karma: number; isBanned: boolean; bannedAt: string | null; banReason: string | null; createdAt: string;
};

const ROLE_OPTIONS = ["USER", "MODERATOR", "ADMIN"] as const;
const ROLE_COLORS: Record<string, string> = {
  USER: "bg-muted text-muted-foreground",
  MODERATOR: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ADMIN: "bg-primary/10 text-primary",
};

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [banModal, setBanModal] = useState<{ userId: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [saving, setSaving] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (roleFilter) params.set("role", roleFilter);
    if (bannedFilter) params.set("banned", bannedFilter);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setTotalPages(d.totalPages ?? 1); })
      .finally(() => setLoading(false));
  }, [debouncedSearch, roleFilter, bannedFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (userId: string, role: string) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
  };

  const banUser = async () => {
    if (!banModal) return;
    setSaving(true);
    await fetch(`/api/admin/users/${banModal.userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: banReason }),
    });
    setSaving(false);
    setBanModal(null);
    setBanReason("");
    setUsers((prev) => prev.map((u) => u.id === banModal.userId ? { ...u, isBanned: true } : u));
  };

  const unbanUser = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}/ban`, { method: "DELETE" });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isBanned: false } : u));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or email..."
          className="flex-1 min-w-48 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={bannedFilter} onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Users</option>
          <option value="true">Banned Only</option>
          <option value="false">Active Only</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-14" />
        ))}</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No users found.</p>
            </div>
          ) : users.map((u, i) => (
            <div key={u.id} className={cn("flex items-center gap-4 px-5 py-4", i !== users.length - 1 && "border-b border-border")}>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {u.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  {u.isBanned && <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Banned</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
                <span className="text-xs font-medium text-muted-foreground">{u.karma} karma</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[u.role])}>{u.role}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {u.isBanned ? (
                  <button onClick={() => unbanUser(u.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors">
                    Unban
                  </button>
                ) : (
                  <button onClick={() => setBanModal({ userId: u.id, name: u.name ?? "this user" })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors">
                    Ban
                  </button>
                )}
              </div>
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

      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Ban {banModal.name}
            </h3>
            <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
            <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3}
              placeholder="Explain the reason for this ban..."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={banUser} disabled={saving || banReason.length < 5}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors">
                {saving ? "Banning..." : "Confirm Ban"}
              </button>
              <button onClick={() => { setBanModal(null); setBanReason(""); }}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
