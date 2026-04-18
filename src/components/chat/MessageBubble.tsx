"use client";

import type { ChatMessage } from "@/hooks/use-group-chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div className={`flex max-w-[75%] gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {!isOwn && (
          <div className="h-7 w-7 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-semibold text-muted-foreground mt-auto">
            {message.senderName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          {!isOwn && (
            <p className="text-[11px] text-muted-foreground mb-0.5 ml-1">
              {message.senderName}
            </p>
          )}
          <div
            className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              isOwn
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            } ${message.pending ? "opacity-60" : ""}`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <p
            className={`text-[10px] text-muted-foreground mt-0.5 ${
              isOwn ? "text-right mr-1" : "ml-1"
            }`}
          >
            {formatTime(message.createdAt)}
            {message.pending && " · Sending..."}
          </p>
        </div>
      </div>
    </div>
  );
}
