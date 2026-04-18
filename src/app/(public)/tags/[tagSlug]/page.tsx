import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DoubtCard } from "@/components/doubts/doubt-card";
import { ServerPagination } from "@/components/ui/server-pagination";
import type { DoubtWithRelations } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tagSlug: string }>;
}) {
  const { tagSlug } = await params;
  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    select: { name: true },
  });

  return {
    title: tag ? `${tag.name} — Peer Connect` : "Tag Not Found",
  };
}

export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tagSlug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const limit = 12;

  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!tag) notFound();

  const [doubts, total] = await Promise.all([
    prisma.doubt.findMany({
      where: { tags: { some: { tagId: tag.id } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        seeker: { select: { id: true, name: true, image: true } },
        helper: { select: { id: true, name: true, image: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { messages: true, bookmarks: true } },
      },
    }),
    prisma.doubt.count({ where: { tags: { some: { tagId: tag.id } } } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/tags" className="hover:text-foreground transition-colors">
          Tags
        </Link>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-foreground">{tag.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
          {tag.name}
        </h1>
        <p className="text-muted-foreground mt-2">
          {total} doubt{total !== 1 ? "s" : ""} tagged with {tag.name}.
        </p>
      </div>

      {doubts.length > 0 ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(doubts as DoubtWithRelations[]).map((doubt) => (
              <DoubtCard key={doubt.id} doubt={doubt} />
            ))}
          </div>
          <div className="mt-8">
            <ServerPagination
              currentPage={page}
              totalPages={totalPages}
              baseUrl={`/tags/${tagSlug}`}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No doubts with this tag yet.</p>
        </div>
      )}
    </div>
  );
}
