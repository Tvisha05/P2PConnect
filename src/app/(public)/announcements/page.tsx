import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatRelativeTime, truncate } from "@/lib/utils";
import { ServerPagination } from "@/components/ui/server-pagination";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Announcements — Peer Connect",
  description: "Platform announcements and updates",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  const limit = 10;

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { author: { select: { id: true, name: true, image: true } } },
    }),
    prisma.announcement.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
          Announcements
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform updates and important notices
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Link
              key={a.id}
              href={`/announcements/${a.id}`}
              className="group block rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300"
            >
              <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                {a.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {truncate(a.body, 200)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                  {a.author.name?.charAt(0)?.toUpperCase() ?? "A"}
                </span>
                <span>{a.author.name}</span>
                <span>·</span>
                <span>{formatRelativeTime(a.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <ServerPagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/announcements"
          />
        </div>
      )}
    </div>
  );
}
