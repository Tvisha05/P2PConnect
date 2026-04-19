"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { onValue, ref as rtdbRef } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useNotifications } from "@/providers/notification-provider";
import { MutualMatchToast } from "@/components/matching/mutual-match-toast";

const FALLBACK_POLL_MS = 30_000;

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
    if (status !== "authenticated" || !session?.user?.id) return;
    const userId = session.user.id;

    // Real-time: Firebase fires instantly when a notification arrives
    const signalRef = rtdbRef(realtimeDb, `users/${userId}/signals/notification`);
    const unsubSignal = onValue(signalRef, () => void poll());

    // Slow fallback in case Firebase is unavailable
    const interval = window.setInterval(() => void poll(), FALLBACK_POLL_MS);

    return () => {
      unsubSignal();
      window.clearInterval(interval);
    };
  }, [poll, status, session?.user?.id]);

  return null;
}
