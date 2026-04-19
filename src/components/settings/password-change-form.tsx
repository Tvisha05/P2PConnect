"use client";

import { useState } from "react";

export function PasswordChangeForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Failed to update password" }); return; }
      setMessage({ type: "success", text: "Password updated successfully" });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const field = (id: keyof typeof form, label: string, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type="password"
        id={id}
        value={form[id]}
        onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        placeholder={placeholder}
        required
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {field("currentPassword", "Current Password", "Enter current password")}
      {field("newPassword", "New Password", "At least 8 characters")}
      {field("confirmPassword", "Confirm New Password", "Repeat new password")}

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
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
