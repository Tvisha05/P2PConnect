"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Urgency = "LOW" | "MEDIUM" | "HIGH";
type Tag = { id: string; name: string; slug: string };

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
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagResults, setTagResults] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [searchingTags, setSearchingTags] = useState(false);
  const [suggestingTag, setSuggestingTag] = useState(false);
  const [tagFeedback, setTagFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const title = useMemo(() => buildTitle(subject), [subject]);
  const trimmedTagSearch = tagSearch.trim();

  useEffect(() => {
    if (!trimmedTagSearch) {
      setTagResults([]);
      setSearchingTags(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSearchingTags(true);
        const res = await fetch(`/api/tags/search?q=${encodeURIComponent(trimmedTagSearch)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Failed to search tags");
        }

        const json = await res.json();
        const nextTags = Array.isArray(json.tags) ? (json.tags as Tag[]) : [];
        setTagResults(
          nextTags.filter((tag) => !selectedTags.some((selectedTag) => selectedTag.id === tag.id))
        );
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setTagResults([]);
        }
      } finally {
        setSearchingTags(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedTagSearch, selectedTags]);

  function addTag(tag: Tag) {
    setSelectedTags((prev) => {
      if (prev.some((selectedTag) => selectedTag.id === tag.id) || prev.length >= 5) {
        return prev;
      }
      return [...prev, tag];
    });
    setTagSearch("");
    setTagResults([]);
    setTagFeedback(null);
  }

  function removeTag(tagId: string) {
    setSelectedTags((prev) => prev.filter((tag) => tag.id !== tagId));
  }

  async function handleSuggestTag() {
    if (!trimmedTagSearch) {
      return;
    }

    setTagFeedback(null);
    setSuggestingTag(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedTagSearch }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTagFeedback(json.error || "Failed to suggest tag.");
        return;
      }

      setTagFeedback(`Suggested "${json.tag?.name ?? trimmedTagSearch}" for review.`);
      setTagSearch("");
      setTagResults([]);
      setShowTagDropdown(false);
    } catch {
      setTagFeedback("Failed to suggest tag.");
    } finally {
      setSuggestingTag(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdded(false);
    setTagFeedback(null);

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
          tagIds: selectedTags.map((tag) => tag.id),
          urgency,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Failed to add to matching pool.");
        return;
      }

      // Matching is already scheduled on the server side after the pool
      // min-wait window. Avoid triggering it again from the client to prevent
      // duplicate group/proposal creation.
      //
      // In practice, background timers can be unreliable in some local/dev
      // setups. Fire a delayed trigger from the active client as a safety net.
      window.setTimeout(() => {
        void fetch("/api/matching/trigger", { method: "POST" }).catch(() => {
          // Best-effort safety trigger
        });
      }, 32_000);
      window.setTimeout(() => {
        void fetch("/api/matching/trigger", { method: "POST" }).catch(() => {
          // Best-effort safety trigger
        });
      }, 42_000);

      setAdded(true);
      setSubject("");
      setDescription("");
      setUrgency("MEDIUM");
      setSelectedTags([]);
      setTagSearch("");
      setTagResults([]);
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

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Tags <span className="font-normal text-muted-foreground">(optional, up to 5)</span>
        </label>

        {selectedTags.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => removeTag(tag.id)}
                disabled={submitting}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {tag.name}
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative">
          <input
            type="text"
            value={tagSearch}
            onChange={(e) => {
              setTagSearch(e.target.value);
              setShowTagDropdown(true);
              setTagFeedback(null);
            }}
            onFocus={() => setShowTagDropdown(true)}
            onBlur={() => setTimeout(() => setShowTagDropdown(false), 150)}
            placeholder="Search approved tags or suggest a new one"
            disabled={submitting || selectedTags.length >= 5}
            className="w-full h-10 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 disabled:cursor-not-allowed disabled:bg-muted"
          />

          {showTagDropdown && trimmedTagSearch ? (
            <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {searchingTags ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">Searching tags...</div>
              ) : tagResults.length > 0 ? (
                tagResults.slice(0, 8).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addTag(tag)}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {tag.name}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSuggestTag}
                  disabled={suggestingTag}
                  className="block w-full px-4 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestingTag ? "Suggesting tag..." : `Suggest "${trimmedTagSearch}"`}
                </button>
              )}
            </div>
          ) : null}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Approved tags can be attached immediately. New suggestions are submitted for review first.
        </p>
        {tagFeedback ? (
          <p className="mt-1 text-xs text-primary">{tagFeedback}</p>
        ) : null}
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

