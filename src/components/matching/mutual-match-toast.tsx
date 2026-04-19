"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNotifications } from "@/providers/notification-provider";

export function MutualMatchToast({
  toastId,
  notifId,
  title,
  body,
  groupUrl,
}: {
  toastId: string | number;
  notifId: string;
  title: string;
  body: string;
  groupUrl: string | null;
}) {
  const router = useRouter();
  const { markAsRead, refresh } = useNotifications();

  const open = async () => {
    toast.dismiss(toastId);
    await markAsRead([notifId]);
    void refresh();
    if (groupUrl) router.push(groupUrl);
  };

  const dismiss = async () => {
    toast.dismiss(toastId);
    await markAsRead([notifId]);
    void refresh();
  };

  return (
    <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void dismiss()}
          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => void open()}
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Open group
        </button>
      </div>
    </div>
  );
}
