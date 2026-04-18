"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useNotifications } from "@/providers/notification-provider";
import { MutualMatchToast } from "@/components/matching/mutual-match-toast";

const POLL_MS = 1_500;

type NotifRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
};

export function MutualMatchNotificationsAlert() {
  const { data: session, status } = useSession();
  const { refresh: refreshNotifications } = useNotifications();
  const surfacedIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const showMutualToast = useCallback((n: NotifRow) => {
    toast.custom(
      (t) => (
        <MutualMatchToast
          toastId={t}
          notifId={n.id}
          title={n.title}
          body={n.body}
          groupUrl={n.linkUrl}
        />
      ),
      {
        id: `mutual-${n.id}`,
        duration: Infinity,
      }
    );

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      document.visibilityState === "hidden"
    ) {
      try {
        new Notification(n.title, { body: n.body, tag: `mutual-${n.id}` });
      } catch {
        // ignore
      }
    }
  }, []);

  const poll = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const res = await fetch("/api/notifications?limit=30", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const items: NotifRow[] = data.items ?? [];

      let hasNew = false;
      for (const n of items) {
        if (
          n.type === "MUTUAL_MATCH" &&
          !n.isRead &&
          !surfacedIdsRef.current.has(n.id)
        ) {
          surfacedIdsRef.current.add(n.id);
          showMutualToast(n);
          hasNew = true;
        }
      }
      if (hasNew) void refreshNotifications();
    } catch {
      // ignore
    } finally {
      inFlightRef.current = false;
    }
  }, [session?.user?.id, status, showMutualToast, refreshNotifications]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll, status]);

  return null;
}
