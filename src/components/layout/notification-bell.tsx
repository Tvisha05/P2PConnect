"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "@/providers/notification-provider";
import { cn, formatRelativeTime } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, inboxError, markAsRead, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onOpen = useCallback(() => {
    setOpen((v) => !v);
    void refresh();
  }, [refresh]);

  const handleItemClick = async (id: string, linkUrl: string | null, isRead: boolean) => {
    if (!isRead) {
      await markAsRead([id]);
    }
    setOpen(false);
    if (linkUrl) {
      router.push(linkUrl);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onOpen}
        title="Notifications"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          unreadCount > 0
            ? "border-primary/40 text-primary ring-2 ring-primary/20"
            : "border-border"
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <svg
          className="h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(70vh,24rem)] overflow-hidden rounded-xl border border-border bg-card shadow-xl dark:shadow-black/40 flex flex-col">
          <div className="border-b border-border px-4 py-3 shrink-0">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {inboxError ? (
              <p className="px-4 py-4 text-sm text-destructive bg-destructive/10 m-2 rounded-lg">
                {inboxError}
              </p>
            ) : null}
            {notifications.length === 0 && !inboxError ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : notifications.length === 0 ? null : (
              <ul className="py-1">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void handleItemClick(n.id, n.linkUrl ?? null, n.isRead)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/60 transition-colors",
                        !n.isRead && "bg-primary/[0.06]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground line-clamp-2">
                          {n.title}
                        </span>
                        {!n.isRead ? (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1.5">
                        {formatRelativeTime(
                          typeof n.createdAt === "string"
                            ? n.createdAt
                            : (n.createdAt as Date).toISOString()
                        )}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
