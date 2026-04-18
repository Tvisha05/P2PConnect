"use client";

import { cn } from "@/lib/utils";

type Category = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string; _count: { doubtTags: number } };

type DoubtFiltersProps = {
  categories: Category[];
  tags: Tag[];
  filters: {
    status: string;
    categoryId: string;
    tags: string;
    urgency: string;
    sort: string;
  };
  onChange: (key: string, value: string) => void;
};

const statuses = [
  { value: "", label: "All Status" },
  { value: "OPEN", label: "Open" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

const urgencies = [
  { value: "", label: "All Urgency" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "upvotes", label: "Most Upvoted" },
  { value: "urgency", label: "By Urgency" },
  { value: "unanswered", label: "Unanswered" },
];

export function DoubtFilters({ categories, tags, filters, onChange }: DoubtFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Sort tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange("sort", opt.value)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filters.sort === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter selects */}
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={filters.status}
          options={statuses}
          onChange={(v) => onChange("status", v)}
        />
        <FilterSelect
          value={filters.urgency}
          options={urgencies}
          onChange={(v) => onChange("urgency", v)}
        />
        <FilterSelect
          value={filters.categoryId}
          options={[
            { value: "", label: "All Categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(v) => onChange("categoryId", v)}
        />
        {tags.length > 0 && (
          <FilterSelect
            value={filters.tags}
            options={[
              { value: "", label: "All Tags" },
              ...tags.slice(0, 20).map((t) => ({
                value: t.slug,
                label: `${t.name} (${t._count.doubtTags})`,
              })),
            ]}
            onChange={(v) => onChange("tags", v)}
          />
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 pr-8 rounded-lg border border-border bg-card text-sm text-foreground appearance-none cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none"
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
  );
}
