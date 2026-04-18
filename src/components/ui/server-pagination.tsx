import Link from "next/link";
import { cn } from "@/lib/utils";

type ServerPaginationProps = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
};

export function ServerPagination({ currentPage, totalPages, baseUrl }: ServerPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const separator = baseUrl.includes("?") ? "&" : "?";

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      {currentPage > 1 ? (
        <Link
          href={`${baseUrl}${separator}page=${currentPage - 1}`}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
      ) : (
        <span className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground opacity-40 flex items-center">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </span>
      )}

      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="h-9 w-9 flex items-center justify-center text-sm text-muted-foreground">
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={`${baseUrl}${separator}page=${page}`}
            className={cn(
              "h-9 min-w-9 px-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
              currentPage === page
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {page}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={`${baseUrl}${separator}page=${currentPage + 1}`}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ) : (
        <span className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground opacity-40 flex items-center">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      )}
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}
