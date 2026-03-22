"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/providers/notification-provider";

const POLL_MS = 1_500;

type NotifRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
};

/**
 * Pop-up for new mutual-help group notifications (MUTUAL_MATCH), mirroring one-way proposal alerts.
 */
export function MutualMatchNotificationsAlert() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { markAsRead, refresh: refreshNotifications } = useNotifications();
  const [modal, setModal] = useState<NotifRow | null>(null);
  const queueRef = useRef<NotifRow[]>([]);
  /** Don’t show the same notification twice in one tab session */
  const surfacedIdsRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.id) return;

    try {
      const res = await fetch("/api/notifications?limit=30", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const items: NotifRow[] = data.items ?? [];

      let newest: NotifRow | null = null;
      for (const n of items) {
        if (
          n.type === "MUTUAL_MATCH" &&
          !n.isRead &&
          !surfacedIdsRef.current.has(n.id)
        ) {
          surfacedIdsRef.current.add(n.id);
          queueRef.current.push(n);
          newest = n;
        }
      }

      if (newest && typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState === "hidden") {
        try {
          new Notification(newest.title, {
            body: newest.body,
            tag: `mutual-${newest.id}`,
          });
        } catch {
          // ignore
        }
      }

      setModal((current) => {
        if (current) return current;
        return queueRef.current.shift() ?? null;
      });
    } catch {
      // ignore
    }
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll, status]);

  const advanceQueue = useCallback(() => {
    setModal(null);
    window.setTimeout(() => {
      setModal(queueRef.current.shift() ?? null);
    }, 0);
  }, []);

  const openGroup = async () => {
    if (!modal) return;
    const url = modal.linkUrl;
    await markAsRead([modal.id]);
    void refreshNotifications();
    advanceQueue();
    if (url) router.push(url);
  };

  const dismiss = async () => {
    if (!modal) return;
    await markAsRead([modal.id]);
    void refreshNotifications();
    advanceQueue();
  };

  if (status !== "authenticated" || !modal) return null;

  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mutual-match-notif-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2
              id="mutual-match-notif-title"
              className="font-display text-lg font-semibold text-foreground"
            >
              {modal.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{modal.body}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => void dismiss()}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => void openGroup()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Open group
          </button>
        </div>
      </div>
    </div>
  );
}
