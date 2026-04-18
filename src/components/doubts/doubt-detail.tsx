import { StatusBadge, UrgencyBadge, Badge } from "@/components/ui/badge";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import Link from "next/link";

type DoubtDetailData = {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  isEdited: boolean;
  createdAt: string | Date;
  seeker: { id: string; name: string | null; image: string | null; karma: number };
  helper?: { id: string; name: string | null; image: string | null; karma: number } | null;
  category: { id: string; name: string; slug: string };
  tags: { tag: { id: string; name: string; slug: string } }[];
  attachments: { id: string; fileName: string; fileUrl: string; fileType: string }[];
  _count: { messages: number; bookmarks: number };
};

export function DoubtDetail({ doubt }: { doubt: DoubtDetailData }) {
  return (
    <article>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <StatusBadge status={doubt.status} />
          <UrgencyBadge urgency={doubt.urgency} />
          <Badge variant="outline">{doubt.category.name}</Badge>
          {doubt.isEdited && (
            <span className="text-xs text-muted-foreground italic">(edited)</span>
          )}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground leading-tight tracking-tight">
          {doubt.title}
        </h1>
      </div>

      {/* Author info */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
          {doubt.seeker.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div>
          <Link
            href={`/users/${doubt.seeker.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {doubt.seeker.name ?? "Anonymous"}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{doubt.seeker.karma} karma</span>
            <span className="text-border">|</span>
            <span title={formatDate(doubt.createdAt)}>
              {formatRelativeTime(doubt.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="prose prose-neutral dark:prose-invert max-w-none mb-6">
        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
          {doubt.description}
        </div>
      </div>

      {/* Tags */}
      {doubt.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {doubt.tags.map(({ tag }) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Attachments */}
      {doubt.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Attachments</h3>
          <div className="flex flex-wrap gap-2">
            {doubt.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm transition-colors"
              >
                <svg className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="text-foreground truncate max-w-[180px]">{att.fileName}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 py-4 border-t border-b border-border text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {doubt.upvoteCount - doubt.downvoteCount} votes
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {doubt._count.messages} messages
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {doubt.viewCount} views
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {doubt._count.bookmarks} bookmarks
        </span>

        {/* Helper info */}
        {doubt.helper && (
          <span className="ml-auto flex items-center gap-1.5 text-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Claimed by{" "}
            <Link
              href={`/users/${doubt.helper.id}`}
              className="font-medium hover:underline"
            >
              {doubt.helper.name}
            </Link>
          </span>
        )}
      </div>
    </article>
  );
}
