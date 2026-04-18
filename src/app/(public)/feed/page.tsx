import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { FeedClient } from "./feed-client";

export const metadata = {
  title: "Feed — Peer Connect",
  description: "Browse academic doubts from the community",
};

export default async function FeedPage() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({
      where: { status: "APPROVED" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { doubtTags: true } },
      },
    }),
  ]);

  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedClient categories={categories} tags={tags} />
    </Suspense>
  );
}

function FeedSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="h-10 w-48 rounded-lg bg-muted animate-pulse mb-4" />
      <div className="h-5 w-64 rounded bg-muted animate-pulse mb-8" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
            <div className="flex gap-2 mb-3">
              <div className="h-5 w-14 rounded-full bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="h-5 w-3/4 rounded bg-muted mb-2" />
            <div className="h-4 w-full rounded bg-muted mb-1" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
