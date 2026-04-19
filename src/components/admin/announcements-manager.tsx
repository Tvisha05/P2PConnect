"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";

type Announcement = {
  id: string; title: string; body: string; sendEmail: boolean; createdAt: string;
  author: { id: string; name: string | null };
};

export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", sendEmail: false });
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements ?? []))
      .finally(() => setLoading(false));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setAnnouncements((prev) => [data.announcement, ...prev]);
      setForm({ title: "", body: "", sendEmail: false });
    }
    setCreating(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    await fetch(`/api/admin/announcements/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setAnnouncements((prev) => prev.map((a) => a.id === editId ? { ...a, ...editForm } : a));
    setSaving(false);
    setEditId(null);
  };

  const deleteAnnouncement = async (id: string) => {
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">New Announcement</h2>
        <form onSubmit={create} className="space-y-4">
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Announcement title" required maxLength={200}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            placeholder="Announcement body..." required rows={4} maxLength={5000}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={form.sendEmail}
                onChange={(e) => setForm((p) => ({ ...p, sendEmail: e.target.checked }))}
                className="rounded border-input" />
              Send email to subscribed users
            </label>
            <button type="submit" disabled={creating || form.title.length < 3 || form.body.length < 10}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
              {creating ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-20" />
        ))}</div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
              {editId === a.id ? (
                <div className="space-y-3">
                  <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <textarea value={editForm.body} onChange={(e) => setEditForm((p) => ({ ...p, body: e.target.value }))}
                    rows={3} className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {a.author.name} · {formatRelativeTime(a.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setEditId(a.id); setEditForm({ title: a.title, body: a.body }); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setDeleteId(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Announcement?</h3>
            <p className="text-sm text-muted-foreground mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteAnnouncement(deleteId)}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors">
                Delete
              </button>
              <button onClick={() => setDeleteId(null)}
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
