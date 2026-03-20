"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DoubtCard } from "@/components/doubts/doubt-card";
import { DoubtFilters } from "@/components/doubts/doubt-filters";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import type { DoubtWithRelations, PaginatedDoubtsResponse } from "@/types";

type Category = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string; _count: { doubtTags: number } };

type Props = {
  categories: Category[];
  tags: Tag[];
};

export function FeedClient({ categories, tags }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PaginatedDoubtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const filters = {
    status: searchParams.get("status") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
    tags: searchParams.get("tags") ?? "",
    urgency: searchParams.get("urgency") ?? "",
    sort: searchParams.get("sort") ?? "newest",
    search: searchParams.get("search") ?? "",
    page: Math.max(1, parseInt(searchParams.get("page") ?? "1")),
  };

  const fetchDoubts = useCallback(async () => {
    setFetching(true);
    setError("");
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.tags) params.set("tags", filters.tags);
    if (filters.urgency) params.set("urgency", filters.urgency);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(filters.page));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/doubts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load doubts. Please try again.");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [filters.status, filters.categoryId, filters.tags, filters.urgency, filters.sort, filters.search, filters.page]);

  useEffect(() => {
    fetchDoubts();
  }, [fetchDoubts]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") {
      params.delete("page");
    }
    router.push(`/feed?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
          Doubt Feed
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse doubts from the community or post your own.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          placeholder="Search doubts..."
          defaultValue={filters.search}
          onSearch={(q) => updateFilter("search", q)}
          className="max-w-md"
        />
      </div>

      {/* Filters */}
      <div className="mb-8">
        <DoubtFilters
          categories={categories}
          tags={tags}
          filters={filters}
          onChange={updateFilter}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchDoubts}
            className="text-xs font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <DoubtCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Loading overlay when refetching */}
          {fetching && (
            <div className="absolute inset-0 z-10 flex items-start justify-center pt-24">
              <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 shadow-lg">
                <svg className="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-foreground">Updating...</span>
              </div>
            </div>
          )}

          <div className={fetching ? "opacity-40 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
            {data && data.doubts.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {data.total} doubt{data.total !== 1 ? "s" : ""} found
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.doubts.map((doubt: DoubtWithRelations) => (
                    <DoubtCard key={doubt.id} doubt={doubt} />
                  ))}
                </div>
                <div className="mt-8">
                  <Pagination
                    currentPage={data.page}
                    totalPages={data.totalPages}
                    onPageChange={(page) => updateFilter("page", String(page))}
                  />
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DoubtCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-14 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="h-5 w-3/4 rounded bg-muted mb-2" />
      <div className="h-4 w-full rounded bg-muted mb-1" />
      <div className="h-4 w-2/3 rounded bg-muted mb-4" />
      <div className="flex justify-between pt-3 border-t border-border/50">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-5">
        <svg className="h-7 w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-1">
        No doubts found
      </h3>
      <p className="text-muted-foreground text-sm">
        Try adjusting your filters or be the first to post a doubt!
      </p>
    </div>
  );
}
