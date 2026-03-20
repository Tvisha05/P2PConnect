"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
};

type Props = {
  groupId: string;
  type: string;
  subjects: string[];
  members: Member[];
  currentUserId: string;
  myRole: string;
};

export function GroupChat({
  groupId,
  type,
  subjects,
  members,
  currentUserId,
  myRole,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/matching/groups/${groupId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: members.find((m) => m.id === currentUserId)?.name ?? null,
        image: null,
      },
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await fetch(`/api/matching/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        await fetchMessages(); // Refresh to get real message
      }
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/groups"
                className="h-9 w-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
              >
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-lg font-semibold text-foreground capitalize">
                    {subjects.join(", ")}
                  </h1>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      type === "cycle"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    {type === "cycle" ? "Mutual" : "One-Way"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {members.length} members — you are{" "}
                  {myRole === "helper" ? "helping" : "learning"}
                </p>
              </div>
            </div>

            {/* Member avatars */}
            <div className="flex -space-x-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`h-8 w-8 rounded-full border-2 border-card flex items-center justify-center text-xs font-semibold ${
                    member.id === currentUserId
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title={`${member.name} (${member.role})`}
                >
                  {member.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg
                className="h-5 w-5 animate-spin text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                No messages yet. Say hello to your group!
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender.id === currentUserId;
              const showAvatar =
                i === 0 || messages[i - 1].sender.id !== msg.sender.id;

              return (
                <div key={msg.id}>
                  {showAvatar && (
                    <div
                      className={`flex items-center gap-2 mt-4 mb-1 ${
                        isMe ? "justify-end" : ""
                      }`}
                    >
                      {!isMe && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.sender.name}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                      {isMe && (
                        <span className="text-xs font-medium text-muted-foreground">
                          You
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : "bg-muted text-foreground rounded-tl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-6 py-4 shrink-0">
        <form
          onSubmit={sendMessage}
          className="max-w-4xl mx-auto flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
