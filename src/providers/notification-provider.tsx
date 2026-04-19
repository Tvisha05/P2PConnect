"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { NotificationItem } from "@/types";
import { onValue, ref as rtdbRef } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

type NotificationContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  /** Set when GET /api/notifications fails (401, 500, network). */
  inboxError: string | null;
  markAsRead: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  inboxError: null,
  markAsRead: async () => {},
  refresh: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const userId = session?.user?.id;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/notifications?limit=20", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        setInboxError(
          res.status === 401
            ? "Couldn’t load notifications (session). Try signing out and back in."
            : typeof errData.error === "string"
              ? errData.error
              : `Couldn’t load notifications (HTTP ${res.status}).`
        );
        return;
      }
      setInboxError(null);
      const data = await res.json();
      setNotifications(data.items ?? []);
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      setInboxError("Network error while loading notifications.");
    } finally {
      inFlightRef.current = false;
    }
  }, [userId]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) =>
        prev.map((n) => (idSet.has(n.id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    } catch {
      // Silently fail
    }
  }, []);

  // Refetch when session becomes available (fixes: first poll ran while session was still loading)
  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      setNotifications([]);
      setUnreadCount(0);
      setInboxError(null);
      return;
    }

    let active = true;
    const poll = () => {
      if (active) void fetchNotifications();
    };
    poll();
    const interval = setInterval(poll, 15_000);

    // Real-time: re-fetch immediately when Firebase signals a new notification
    const signalRef = rtdbRef(realtimeDb, `users/${userId}/signals/notification`);
    const unsubSignal = onValue(signalRef, () => {
      if (active) void fetchNotifications();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      unsubSignal();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, userId, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        inboxError,
        markAsRead,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
