import Link from "next/link";
import { StatusBadge, UrgencyBadge, Badge } from "@/components/ui/badge";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { DoubtWithRelations } from "@/types";

export function DoubtCard({ doubt }: { doubt: DoubtWithRelations }) {
  return (
    <Link
      href={`/doubts/${doubt.id}`}
      className="group block rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300"
    >
      {/* Top row: badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <StatusBadge status={doubt.status} />
        <UrgencyBadge urgency={doubt.urgency} />
        <Badge variant="outline">{doubt.category.name}</Badge>
      </div>

      {/* Title */}
      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
        {truncate(doubt.title, 100)}
      </h3>

      {/* Description preview */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {truncate(doubt.description, 160)}
      </p>

      {/* Tags */}
      {doubt.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {doubt.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: meta */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
        <div className="flex items-center gap-3">
          {/* Author */}
          <span className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
              {doubt.seeker.name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
            {doubt.seeker.name ?? "Anonymous"}
          </span>
          {/* Time */}
          <span>{formatRelativeTime(doubt.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Votes */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            {doubt.upvoteCount - doubt.downvoteCount}
          </span>
          {/* Messages */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {doubt._count?.messages ?? 0}
          </span>
          {/* Views */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {doubt.viewCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
