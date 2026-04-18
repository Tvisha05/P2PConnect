"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Prefs = {
  doubtClaimed: boolean; newMessage: boolean; doubtResolved: boolean;
  tagNewDoubt: boolean; announcements: boolean; weeklyDigest: boolean;
};

const PREF_LABELS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "doubtClaimed", label: "Doubt Claimed", description: "When a peer claims your doubt" },
  { key: "newMessage", label: "New Message", description: "When you receive a new chat message" },
  { key: "doubtResolved", label: "Doubt Resolved", description: "When your doubt is marked resolved" },
  { key: "tagNewDoubt", label: "Tag Activity", description: "When a new doubt is posted with your followed tags" },
  { key: "announcements", label: "Announcements", description: "Platform updates and important notices" },
  { key: "weeklyDigest", label: "Weekly Digest", description: "A weekly summary of activity" },
];

export function EmailPreferencesForm({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);

  const toggle = async (key: keyof Prefs) => {
    const newVal = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: newVal }));
    setSaving(key);
    try {
      await fetch("/api/profile/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !newVal }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {PREF_LABELS.map(({ key, label, description }) => (
        <div key={key} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            disabled={saving === key}
            onClick={() => toggle(key)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-60",
              prefs[key] ? "bg-primary" : "bg-muted border border-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                prefs[key] ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
