"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Urgency = "LOW" | "MEDIUM" | "HIGH";

type Props = {
  defaultCategoryId: string;
};

function buildTitle(subject: string) {
  const s = subject.trim();
  return s.length ? `Help with ${s}` : "";
}
 
export function QuickPoolEntryForm({ defaultCategoryId }: Props) {
  const [subject, setSubject] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("MEDIUM");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const title = useMemo(() => buildTitle(subject), [subject]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdded(false);

    const cleanSubject = subject.trim();
    if (!cleanSubject) {
      setError("Please enter a doubt topic/subject.");
      return;
    }

    // Pre-checks so we can show a nicer message than a schema error.
    if (title.length < 10) {
      setError("Topic is too short. Try something more specific.");
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 0 && trimmedDescription.length < 30) {
      setError("Description is optional, but if provided it must be at least 30 characters.");
      return;
    }
    if (!defaultCategoryId) {
      setError("No active category found. Please try again later.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject: cleanSubject,
          description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
          categoryId: defaultCategoryId,
          urgency,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Failed to add to matching pool.");
        return;
      }

      setAdded(true);
      setSubject("");
      setDescription("");
      setUrgency("MEDIUM");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-5 transition-opacity duration-200", submitting && "opacity-60 pointer-events-none")}
    >
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {added ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          Added to the waiting pool. Matching will start automatically.
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Doubt Topic <span className="font-normal text-muted-foreground">(used for matching)</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Data Structures, Thermodynamics, DBMS"
          required
          maxLength={100}
          disabled={submitting}
          className="w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all disabled:bg-muted disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Urgency</label>
        <div className="flex gap-2">
          {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setUrgency(level)}
              disabled={submitting}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-50",
                urgency === level
                  ? level === "LOW"
                    ? "border-urgency-low bg-urgency-low/10 text-urgency-low"
                    : level === "MEDIUM"
                      ? "border-urgency-medium bg-urgency-medium/10 text-urgency-medium"
                      : "border-urgency-high bg-urgency-high/10 text-urgency-high"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {level === "LOW" ? "Low" : level === "MEDIUM" ? "Medium" : "High"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional. Add context so helpers can answer better."
          maxLength={10000}
          rows={5}
          disabled={submitting}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all resize-y min-h-[120px] disabled:bg-muted disabled:cursor-not-allowed"
        />
        {description.trim().length > 0 ? (
          <p className="text-xs text-muted-foreground mt-1">
            {description.length}/10,000 characters
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Leave blank to auto-generate.</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || subject.trim().length === 0}
          className="rounded-xl bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:pointer-events-none"
        >
          {submitting ? "Adding..." : "Add to Pool"}
        </button>
      </div>
    </form>
  );
}

