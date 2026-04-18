"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ref as rtdbRef, set, onValue, onDisconnect, remove } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

interface UseTypingIndicatorOptions {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  enabled: boolean;
}

export function useTypingIndicator({
  groupId,
  currentUserId,
  currentUserName,
  enabled,
}: UseTypingIndicatorOptions) {
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRef = useRef(false);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!enabled) return;
      const r = rtdbRef(realtimeDb, `groups/${groupId}/typing/${currentUserId}`);
      if (isTyping) {
        await set(r, { name: currentUserName, timestamp: Date.now() });
      } else {
        await remove(r);
      }
      typingRef.current = isTyping;
    },
    [groupId, currentUserId, currentUserName, enabled]
  );

  const onKeyPress = useCallback(() => {
    if (!enabled) return;

    if (!typingRef.current) {
      setTyping(true);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  }, [enabled, setTyping]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (typingRef.current) {
      setTyping(false);
    }
  }, [setTyping]);

  useEffect(() => {
    if (!enabled) return;

    const r = rtdbRef(realtimeDb, `groups/${groupId}/typing`);

    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      if (!val) {
        setTypingUsers([]);
        return;
      }

      const now = Date.now();
      const users: { userId: string; name: string }[] = [];
      for (const [uid, data] of Object.entries(val)) {
        if (uid === currentUserId) continue;
        const d = data as { name: string; timestamp: number };
        if (now - d.timestamp < 5000) {
          users.push({ userId: uid, name: d.name });
        }
      }
      setTypingUsers(users);
    });

    const myRef = rtdbRef(realtimeDb, `groups/${groupId}/typing/${currentUserId}`);
    onDisconnect(myRef).remove();

    return () => {
      unsub();
      stopTyping();
    };
  }, [groupId, currentUserId, enabled, stopTyping]);

  return { typingUsers, onKeyPress, stopTyping };
}
