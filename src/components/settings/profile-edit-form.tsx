"use client";

import { useState } from "react";

type Props = {
  initialData: { name: string; bio: string | null; image: string | null };
};

export function ProfileEditForm({ initialData }: Props) {
  const [form, setForm] = useState({
    name: initialData.name ?? "",
    bio: initialData.bio ?? "",
    image: initialData.image ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          bio: form.bio || undefined,
          image: form.image || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Failed to save" }); return; }
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          placeholder="Your name"
          maxLength={50}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Bio
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            {form.bio.length}/500
          </span>
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
          placeholder="Tell others about yourself..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Avatar URL
          <span className="text-muted-foreground font-normal ml-2 text-xs">optional</span>
        </label>
        <input
          type="url"
          value={form.image}
          onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          placeholder="https://example.com/avatar.png"
        />
      </div>

      {message && (
        <div className={`rounded-xl p-4 text-sm border ${
          message.type === "success"
            ? "bg-success/10 text-success border-success/20"
            : "bg-destructive/10 text-destructive border-destructive/20"
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
      >
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
