"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ref as rtdbRef, onChildAdded, query, orderByChild, startAfter, off } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import {
  initCrypto,
  encryptMessage,
  decryptMessage,
  generateGroupKey,
  sealGroupKey,
  openGroupKey,
} from "@/lib/crypto";
import { saveGroupKey, getGroupKey } from "@/lib/keystore";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string | null;
  content: string;
  createdAt: string;
  pending?: boolean;
}

interface UseGroupChatOptions {
  groupId: string;
  currentUserId: string;
  publicKey: string | null;
  privateKey: string | null;
  keysReady: boolean;
}

export function useGroupChat({
  groupId,
  currentUserId,
  publicKey,
  privateKey,
  keysReady,
}: UseGroupChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [groupKeyReady, setGroupKeyReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupKeyRef = useRef<string | null>(null);
  const seenIdsRef = useRef(new Set<string>());
  const latestTimestampRef = useRef<string | null>(null);

  const ensureGroupKey = useCallback(async (): Promise<string | null> => {
    if (!publicKey || !privateKey) {
      console.error("[E2E] Cannot establish group key: user keypair not ready");
      return null;
    }

    if (groupKeyRef.current) return groupKeyRef.current;

    const cached = await getGroupKey(groupId);

    // Step 1: Check if server already has an encrypted group key for us.
    // If this request fails transiently, keep chat usable via cached key.
    let keyData: { encryptedKey: string | null; groupHasKeys: boolean };
    try {
      const keyRes = await fetch(`/api/matching/groups/${groupId}/keys`);
      if (!keyRes.ok) {
        console.error("[E2E] Failed to fetch group key:", keyRes.status);
        if (cached) {
          groupKeyRef.current = cached;
          return cached;
        }
        return null;
      }
      keyData = await keyRes.json();
    } catch {
      if (cached) {
        groupKeyRef.current = cached;
        return cached;
      }
      return null;
    }

    if (keyData.encryptedKey) {
      try {
        const gk = openGroupKey(keyData.encryptedKey, publicKey, privateKey);
        await saveGroupKey(groupId, gk);
        groupKeyRef.current = gk;
        return gk;
      } catch {
        // Stale sealed key — delete it so another member can re-seal for us
        console.warn("[E2E] Stale sealed key. Deleting and waiting for re-seal...");
        await fetch(`/api/matching/groups/${groupId}/keys`, { method: "DELETE" });
      }
    }

    // If server has no sealed key for us yet, use cache as temporary fallback.
    if (cached) {
      groupKeyRef.current = cached;
      return cached;
    }

    // Step 2: Does the group already have keys distributed by someone else?
    if (keyData.groupHasKeys) {
      // Try a few times for an existing member's re-seal interval to provide our key
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        const retryRes = await fetch(`/api/matching/groups/${groupId}/keys`);
        const retryData = await retryRes.json();
        if (retryData.encryptedKey) {
          try {
            const gk = openGroupKey(retryData.encryptedKey, publicKey, privateKey);
            await saveGroupKey(groupId, gk);
            groupKeyRef.current = gk;
            return gk;
          } catch {
            await fetch(`/api/matching/groups/${groupId}/keys`, { method: "DELETE" });
            continue;
          }
        }
      }
      // No re-seal arrived — fall through to generate a new group key
    }

    // Step 3: No keys exist at all — we're the first. Generate and distribute.
    const membersRes = await fetch(`/api/matching/groups/${groupId}/members/keys`);
    if (!membersRes.ok) {
      console.error("[E2E] Failed to fetch member keys:", membersRes.status);
      return null;
    }
    const membersData = await membersRes.json();

    const membersWithKeys = (membersData.members ?? []).filter(
      (m: { publicKey: string | null }) => m.publicKey
    );

    if (membersWithKeys.length === 0) {
      // Our own pubkey might not be registered yet, wait and retry
      await new Promise((r) => setTimeout(r, 2000));
      const retryRes = await fetch(`/api/matching/groups/${groupId}/members/keys`);
      const retryData = await retryRes.json();
      const retryWithKeys = (retryData.members ?? []).filter(
        (m: { publicKey: string | null }) => m.publicKey
      );
      if (retryWithKeys.length === 0) {
        console.error("[E2E] No members with public keys");
        return null;
      }
      return distribute(retryWithKeys);
    }

    return distribute(membersWithKeys);

    async function distribute(
      members: { userId: string; publicKey: string }[]
    ): Promise<string | null> {
      const newGroupKey = generateGroupKey();

      const keys = members.map((m) => ({
        userId: m.userId,
        encryptedKey: sealGroupKey(newGroupKey, m.publicKey),
      }));

      const storeRes = await fetch(`/api/matching/groups/${groupId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });

      if (!storeRes.ok) {
        console.error("[E2E] Failed to store group keys:", storeRes.status);
        return null;
      }

      // Verify our key was stored (first-wins: another member may have distributed before us)
      const verifyRes = await fetch(`/api/matching/groups/${groupId}/keys`);
      const verifyData = await verifyRes.json();
      if (verifyData.encryptedKey) {
        try {
          const gk = openGroupKey(verifyData.encryptedKey, publicKey!, privateKey!);
          await saveGroupKey(groupId, gk);
          groupKeyRef.current = gk;
          return gk;
        } catch {
          // Stale sealed key — delete it and use the key we generated.
          // The re-seal interval will create correct sealed keys for everyone.
          await fetch(`/api/matching/groups/${groupId}/keys`, { method: "DELETE" });
        }
      }

      // We were the first — use the key we generated
      await saveGroupKey(groupId, newGroupKey);
      groupKeyRef.current = newGroupKey;
      return newGroupKey;
    }
  }, [groupId, publicKey, privateKey]);

  const decryptRow = useCallback(
    (row: { id: string; content: string; nonce: string; sender: { id: string; name: string; image: string | null }; createdAt: string }, gk: string): ChatMessage | null => {
      try {
        const plaintext = decryptMessage(row.content, row.nonce, gk);
        return {
          id: row.id,
          senderId: row.sender.id,
          senderName: row.sender.name ?? "Unknown",
          senderImage: row.sender.image,
          content: plaintext,
          createdAt: row.createdAt,
        };
      } catch {
        return {
          id: row.id,
          senderId: row.sender.id,
          senderName: row.sender.name ?? "Unknown",
          senderImage: row.sender.image,
          content: "[Unable to decrypt]",
          createdAt: row.createdAt,
        };
      }
    },
    []
  );

  useEffect(() => {
    if (!keysReady) return;

    let cancelled = false;

    (async () => {
      try {
        await initCrypto();
        const gk = await ensureGroupKey();
        if (cancelled || !gk) {
          if (!gk) setError("Could not establish group encryption key");
          return;
        }
        setGroupKeyReady(true);

        const res = await fetch(`/api/matching/groups/${groupId}/messages`);
        const data = await res.json();

        if (cancelled) return;

        const decrypted: ChatMessage[] = [];
        for (const row of data.messages ?? []) {
          seenIdsRef.current.add(row.id);
          const msg = decryptRow(row, gk);
          if (msg) decrypted.push(msg);
        }

        if (decrypted.length > 0) {
          latestTimestampRef.current = decrypted[decrypted.length - 1].createdAt;
        }

        setMessages(decrypted);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        console.error("Chat init error:", err);
        setError("Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keysReady, groupId, ensureGroupKey, decryptRow]);

  useEffect(() => {
    if (!groupKeyReady) return;

    const gk = groupKeyRef.current;
    if (!gk) return;

    const messagesRef = rtdbRef(realtimeDb, `groups/${groupId}/messages`);
    const q = latestTimestampRef.current
      ? query(messagesRef, orderByChild("createdAt"), startAfter(latestTimestampRef.current))
      : messagesRef;

    const unsub = onChildAdded(q, (snap) => {
      const key = snap.key;
      if (!key) return;

      const val = snap.val();
      if (!val) return;

      seenIdsRef.current.add(key);
      latestTimestampRef.current = val.createdAt;

      let content: string;
      try {
        content = decryptMessage(val.ciphertext, val.nonce, gk);
      } catch {
        content = "[Unable to decrypt]";
      }

      const msg: ChatMessage = {
        id: key,
        senderId: val.senderId,
        senderName: val.senderName ?? val.senderId,
        senderImage: null,
        content,
        createdAt: val.createdAt,
      };

      setMessages((prev) => {
        // Skip if already present (from initial fetch)
        if (prev.some((m) => m.id === key)) return prev;
        // Replace pending message from same sender around same time
        const pendingIdx = prev.findIndex(
          (m) => m.pending && m.senderId === val.senderId
        );
        if (pendingIdx !== -1) {
          const next = [...prev];
          next[pendingIdx] = msg;
          return next;
        }
        return [...prev, msg];
      });
    });

    return () => {
      off(q);
      unsub();
    };
  }, [groupKeyReady, groupId]);

  // Periodically re-seal the group key for members who don't have it yet
  useEffect(() => {
    if (!groupKeyReady || !publicKey) return;
    const gk = groupKeyRef.current;
    if (!gk) return;

    const reseal = async () => {
      try {
        const membersRes = await fetch(`/api/matching/groups/${groupId}/members/keys`);
        if (!membersRes.ok) return;
        const { members: allMembers } = await membersRes.json();

        const withPubkeys = (allMembers ?? []).filter(
          (m: { publicKey: string | null }) => m.publicKey
        );
        if (withPubkeys.length === 0) return;

        const keys = withPubkeys.map((m: { userId: string; publicKey: string }) => ({
          userId: m.userId,
          encryptedKey: sealGroupKey(gk, m.publicKey),
        }));

        await fetch(`/api/matching/groups/${groupId}/keys`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys }),
        });
      } catch {
        // Silently retry next interval
      }
    };

    reseal();
    const interval = setInterval(reseal, 5000);
    return () => clearInterval(interval);
  }, [groupKeyReady, groupId, publicKey]);

  const send = useCallback(
    async (plaintext: string) => {
      const gk = groupKeyRef.current;
      if (!gk) return;

      const tempId = `pending-${Date.now()}`;
      const pendingMsg: ChatMessage = {
        id: tempId,
        senderId: currentUserId,
        senderName: "You",
        senderImage: null,
        content: plaintext,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, pendingMsg]);

      try {
        const { ciphertext, nonce } = encryptMessage(plaintext, gk);

        const res = await fetch(`/api/matching/groups/${groupId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ciphertext, nonce }),
        });

        if (!res.ok) throw new Error("Send failed");

        const data = await res.json();
        const realId = data.message.id;
        seenIdsRef.current.add(realId);

        setMessages((prev) => {
          // If Firebase already replaced the pending msg, just ensure no stale pending remains
          const hasReal = prev.some((m) => m.id === realId);
          if (hasReal) {
            return prev.filter((m) => m.id !== tempId);
          }
          // Otherwise reconcile the pending message
          return prev.map((m) =>
            m.id === tempId ? { ...m, id: realId, pending: false, createdAt: data.message.createdAt } : m
          );
        });
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [currentUserId, groupId]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor) return;
    const gk = groupKeyRef.current;
    if (!gk) return;

    const res = await fetch(
      `/api/matching/groups/${groupId}/messages?cursor=${nextCursor}`
    );
    const data = await res.json();

    const decrypted: ChatMessage[] = [];
    for (const row of data.messages ?? []) {
      if (seenIdsRef.current.has(row.id)) continue;
      seenIdsRef.current.add(row.id);
      const msg = decryptRow(row, gk);
      if (msg) decrypted.push(msg);
    }

    setMessages((prev) => [...decrypted, ...prev]);
    setHasMore(data.hasMore ?? false);
    setNextCursor(data.nextCursor ?? null);
  }, [hasMore, nextCursor, groupId, decryptRow]);

  return { messages, send, loadMore, loading, hasMore, error, groupKeyReady };
}
