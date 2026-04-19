"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNotifications } from "@/providers/notification-provider";

export type ProposalToastData = {
  proposalId: string;
  learnerNames: string;
  subjects: string[];
};

export function ProposalActionToast({
  toastId,
  proposalId,
  learnerNames,
  subjects,
}: ProposalToastData & { toastId: string | number }) {
  const router = useRouter();
  const { refresh } = useNotifications();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/matching/proposals/${proposalId}/accept`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Could not accept.");
        setActing(false);
        return;
      }
      toast.dismiss(toastId);
      void refresh();
      toast.success("Group formed!");
      if (j.group?.id) router.push(`/groups/${j.group.id}`);
    } catch {
      setError("Network error. Try again.");
      setActing(false);
    }
  };

  const decline = async () => {
    setActing(true);
    try {
      await fetch(`/api/matching/proposals/${proposalId}/reject`, {
        method: "POST",
      });
    } catch {
      // best-effort
    }
    toast.dismiss(toastId);
    void refresh();
  };

  return (
    <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            New match invitation
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            <span className="font-medium text-foreground">{learnerNames}</span>{" "}
            {learnerNames.includes(",") ? "need" : "needs"} help with{" "}
            <span className="font-medium text-foreground capitalize">
              {subjects.join(", ")}
            </span>
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void decline()}
          disabled={acting}
          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => void accept()}
          disabled={acting}
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {acting ? "Please wait…" : "Accept"}
        </button>
      </div>
    </div>
  );
}
