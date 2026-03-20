import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DoubtDetail } from "@/components/doubts/doubt-detail";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doubtId: string }>;
}) {
  const { doubtId } = await params;
  const doubt = await prisma.doubt.findUnique({
    where: { id: doubtId },
    select: { title: true },
  });

  return {
    title: doubt ? `${doubt.title} — Peer Connect` : "Doubt Not Found",
  };
}

export default async function DoubtDetailPage({
  params,
}: {
  params: Promise<{ doubtId: string }>;
}) {
  const { doubtId } = await params;

  const doubt = await prisma.doubt.findUnique({
    where: { id: doubtId },
    include: {
      seeker: { select: { id: true, name: true, image: true, karma: true } },
      helper: { select: { id: true, name: true, image: true, karma: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      attachments: {
        select: { id: true, fileName: true, fileUrl: true, fileType: true },
      },
      _count: { select: { messages: true, bookmarks: true } },
    },
  });

  if (!doubt) notFound();

  // Increment view count (fire and forget)
  prisma.doubt
    .update({ where: { id: doubtId }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/feed" className="hover:text-foreground transition-colors">
          Feed
        </Link>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-foreground truncate max-w-[300px]">
          {doubt.title}
        </span>
      </nav>

      {/* Doubt detail card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <DoubtDetail
          doubt={{
            ...doubt,
            createdAt: doubt.createdAt.toISOString(),
          }}
        />
      </div>

      {/* Chat section placeholder — will be implemented in Phase 5 */}
      {(doubt.status === "CLAIMED" || doubt.status === "IN_PROGRESS") && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Chat will be available here once real-time messaging is implemented.
          </p>
        </div>
      )}
    </div>
  );
}
