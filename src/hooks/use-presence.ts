"use client";

import { useState, useEffect } from "react";
import { ref as rtdbRef, set, onValue, onDisconnect, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

interface UsePresenceOptions {
  groupId: string;
  currentUserId: string;
  enabled: boolean;
}

export function usePresence({
  groupId,
  currentUserId,
  enabled,
}: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const myRef = rtdbRef(
      realtimeDb,
      `groups/${groupId}/presence/${currentUserId}`
    );

    set(myRef, { online: true, lastSeen: serverTimestamp() });

    onDisconnect(myRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });

    const presenceRef = rtdbRef(realtimeDb, `groups/${groupId}/presence`);
    const unsub = onValue(presenceRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setOnlineUsers(new Set());
        return;
      }

      const online = new Set<string>();
      for (const [uid, data] of Object.entries(val)) {
        if ((data as { online: boolean }).online) {
          online.add(uid);
        }
      }
      setOnlineUsers(online);
    });

    return () => {
      unsub();
      set(myRef, { online: false, lastSeen: serverTimestamp() });
    };
  }, [groupId, currentUserId, enabled]);

  return { onlineUsers };
}
