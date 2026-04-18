"use client";

import { useEffect, useRef } from "react";
import { useE2EKeys } from "@/hooks/use-e2e-keys";
import { useGroupChat } from "@/hooks/use-group-chat";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { usePresence } from "@/hooks/use-presence";
import { MessageBubble } from "./MessageBubble";
import { ChatComposer } from "./ChatComposer";
import { EncryptionBanner } from "./EncryptionBanner";

interface Member {
  id: string;
  name: string;
  image: string | null;
  role: string;
}

interface ChatRoomProps {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  members: Member[];
}

export function ChatRoom({
  groupId,
  currentUserId,
  currentUserName,
  members,
}: ChatRoomProps) {
  const { ready: keysReady, publicKey, privateKey, error: keyError } = useE2EKeys();

  const {
    messages,
    send,
    loadMore,
    loading,
    hasMore,
    error: chatError,
    groupKeyReady,
  } = useGroupChat({
    groupId,
    currentUserId,
    publicKey,
    privateKey,
    keysReady,
  });

  const { typingUsers, onKeyPress, stopTyping } = useTypingIndicator({
    groupId,
    currentUserId,
    currentUserName,
    enabled: groupKeyReady,
  });

  const { onlineUsers } = usePresence({
    groupId,
    currentUserId,
    enabled: groupKeyReady,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop < 60) {
      loadMore();
    }
  };

  const error = keyError || chatError;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!keysReady || loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          {!keysReady ? "Setting up encryption..." : "Loading messages..."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ height: "500px" }}>
      {/* Online indicator */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <div className="flex -space-x-1.5">
          {members.slice(0, 5).map((m) => (
            <div key={m.id} className="relative">
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                  onlineUsers.has(m.id) ? "bg-emerald-500" : "bg-muted-foreground/30"
                }`}
              />
            </div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {onlineUsers.size} online
        </span>
      </div>

      <EncryptionBanner />

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
      >
        {hasMore && (
          <button
            onClick={loadMore}
            className="mx-auto mb-3 block text-xs text-primary hover:underline"
          >
            Load older messages
          </button>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <svg className="h-8 w-8 mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-muted-foreground">
          {typingUsers.map((u) => u.name).join(", ")}{" "}
          {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Composer */}
      <ChatComposer
        onSend={send}
        onKeyPress={onKeyPress}
        onStopTyping={stopTyping}
        disabled={!groupKeyReady}
      />
    </div>
  );
}
