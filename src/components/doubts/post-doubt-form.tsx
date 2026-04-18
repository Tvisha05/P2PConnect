"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Category = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string };

type SimilarDoubt = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  categories: Category[];
  tags: Tag[];
};

export function PostDoubtForm({ categories, tags }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [tagSearch, setTagSearch] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const [similar, setSimilar] = useState<SimilarDoubt[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tagLimitHit, setTagLimitHit] = useState(false);

  const debouncedTitle = useDebounce(title, 500);
  const debouncedDescription = useDebounce(description, 800);

  // Fetch similar doubts using title + description
  const fetchSimilar = useCallback(async (t: string, d: string) => {
    if (t.length < 10) {
      setSimilar([]);
      return;
    }
    const params = new URLSearchParams({ title: t });
    if (d.length >= 10) params.set("description", d);
    try {
      const res = await fetch(`/api/doubts/similar?${params.toString()}`);
      const json = await res.json();
      setSimilar(json.doubts ?? []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchSimilar(debouncedTitle, debouncedDescription);
  }, [debouncedTitle, debouncedDescription, fetchSimilar]);

  function toggleTag(tagId: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        setTagLimitHit(false);
        return prev.filter((id) => id !== tagId);
      }
      if (prev.length >= 5) {
        setTagLimitHit(true);
        return prev;
      }
      setTagLimitHit(false);
      return [...prev, tagId];
    });
  }

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !selectedTags.includes(t.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          description: description.trim().length > 0 ? description : undefined,
          categoryId,
          tagIds: selectedTags,
          urgency,
        }),
      });

      const json = await res.json();
      if (res.ok && json.doubt) {
        router.push(`/doubts/${json.doubt.id}`);
      } else {
        setError(json.error || "Failed to create doubt");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6 transition-opacity duration-200", submitting && "opacity-60 pointer-events-none")}>
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's your doubt about?"
          required
          minLength={10}
          maxLength={255}
          disabled={submitting}
          className="w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all disabled:bg-muted disabled:cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {title.length}/255 characters (min 10)
        </p>
      </div>

      {/* Subject / Topic */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Subject
          <span className="font-normal text-muted-foreground ml-1">(used for peer matching)</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Data Structures, Thermodynamics, Linear Algebra"
          required
          maxLength={100}
          disabled={submitting}
          className="w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all disabled:bg-muted disabled:cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">
          The subject this doubt is about — peers strong in this subject will be matched to help you
        </p>
      </div>

      {/* Similar doubts */}
      {similar.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground mb-2">
            Similar doubts already exist:
          </p>
          <ul className="space-y-1.5">
            {similar.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/doubts/${s.id}`}
                  target="_blank"
                  className="text-sm text-primary hover:underline"
                >
                  {s.title}
                  <span className="text-xs text-muted-foreground ml-1.5">
                    ({s.status.toLowerCase()})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Explain your doubt in detail. Include what you've tried, what's confusing, and any relevant context."
          maxLength={10000}
          rows={8}
          disabled={submitting}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all resize-y min-h-[160px] disabled:bg-muted disabled:cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {description.length}/10,000 characters
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Category
        </label>
        <div className="relative">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={submitting}
            className="w-full h-11 px-4 pr-10 rounded-xl border border-border bg-card text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all disabled:bg-muted disabled:cursor-not-allowed"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Tags <span className="font-normal text-muted-foreground">(up to 5)</span>
        </label>

        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedTags.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              return (
                <button
                  key={tagId}
                  type="button"
                  onClick={() => toggleTag(tagId)}
                  disabled={submitting}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {tag?.name}
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}

        {/* Tag limit feedback */}
        {tagLimitHit && (
          <p className="text-xs text-warning mb-2">
            Maximum 5 tags reached. Remove one to add another.
          </p>
        )}

        {/* Tag search */}
        <div className="relative">
          <input
            type="text"
            value={tagSearch}
            onChange={(e) => {
              setTagSearch(e.target.value);
              setShowTagDropdown(true);
            }}
            onFocus={() => setShowTagDropdown(true)}
            onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
            placeholder="Search tags..."
            disabled={submitting}
            className="w-full h-10 px-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all disabled:bg-muted disabled:cursor-not-allowed"
          />
          {showTagDropdown && filteredTags.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {filteredTags.slice(0, 10).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    toggleTag(tag.id);
                    setTagSearch("");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Urgency */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Urgency
        </label>
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

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href="/feed"
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            submitting && "pointer-events-none opacity-50"
          )}
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:pointer-events-none flex items-center gap-2"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {submitting ? "Posting..." : "Post Doubt"}
        </button>
      </div>
    </form>
  );
}
