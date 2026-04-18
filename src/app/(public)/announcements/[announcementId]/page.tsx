import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const a = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { title: true },
  });
  return { title: a ? `${a.title} — Peer Connect` : "Announcement Not Found" };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  if (!announcement) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/announcements" className="hover:text-foreground transition-colors">
          Announcements
        </Link>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-foreground truncate max-w-[300px]">{announcement.title}</span>
      </nav>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight mb-4">
          {announcement.title}
        </h1>

        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {announcement.author.name?.charAt(0)?.toUpperCase() ?? "A"}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{announcement.author.name}</p>
            <p className="text-xs text-muted-foreground">{formatDate(announcement.createdAt)}</p>
          </div>
        </div>

        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {announcement.body}
        </div>
      </div>
    </div>
  );
}
