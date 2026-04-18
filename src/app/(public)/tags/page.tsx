import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "Tags — Peer Connect",
  description: "Browse doubt tags and find topics that interest you",
};

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { doubtTags: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
          Tags
        </h1>
        <p className="text-muted-foreground mt-2">
          Explore topics and find doubts that match your interests.
        </p>
      </div>

      {tags.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.04] transition-all duration-200"
            >
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {tag.name}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {tag._count.doubtTags}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No tags available yet.</p>
        </div>
      )}
    </div>
  );
}
