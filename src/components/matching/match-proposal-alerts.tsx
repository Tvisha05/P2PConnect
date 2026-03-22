"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/providers/notification-provider";

const POLL_MS = 800;

type MemberDetail = {
  id: string;
  name: string | null;
  image: string | null;
  isHelper: boolean;
};

type ApiProposal = {
  id: string;
  type: string;
  subjects: string[];
  expiresAt: string;
  memberDetails: MemberDetail[];
};

/**
 * Fast poll for pending match proposals where the current user is the helper.
 * Shows a modal immediately when a new proposal appears + optional system notification.
 */
export function MatchProposalAlerts() {
  const { data: session, status } = useSession();
  const { refresh: refreshNotifications } = useNotifications();
  const [modal, setModal] = useState<ApiProposal | null>(null);
  const queueRef = useRef<ApiProposal[]>([]);
  /** Proposal IDs we already surfaced in a modal (session-only; avoids repeat popups) */
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.id) return;

    try {
      const res = await fetch("/api/matching/proposals", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: ApiProposal[] = data.proposals ?? [];

      let newest: ApiProposal | null = null;
      for (const p of list) {
        if (!alertedIdsRef.current.has(p.id)) {
          alertedIdsRef.current.add(p.id);
          queueRef.current.push(p);
          newest = p;
        }
      }

      if (newest) {
        void refreshNotifications();
        if (
          typeof window !== "undefined" &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          document.visibilityState === "hidden"
        ) {
          const names = newest.memberDetails
            .filter((m) => !m.isHelper)
            .map((m) => m.name ?? "Peer")
            .join(", ");
          try {
            new Notification("PeerConnect — Match invitation", {
              body: `${names || "Peers"} need help with: ${newest.subjects.join(", ")}`,
              tag: `proposal-${newest.id}`,
            });
          } catch {
            // ignore
          }
        }
      }

      setModal((current) => {
        if (current) return current;
        return queueRef.current.shift() ?? null;
      });
    } catch {
      // ignore transient errors
    }
  }, [session?.user?.id, status, refreshNotifications]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, status]);

  const closeAndAdvance = useCallback(() => {
    setError(null);
    setModal(null);
    window.setTimeout(() => {
      setModal(queueRef.current.shift() ?? null);
    }, 0);
  }, []);

  const accept = async () => {
    if (!modal) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/matching/proposals/${modal.id}/accept`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Could not accept.");
        return;
      }
      void refreshNotifications();
      closeAndAdvance();
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!modal) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/matching/proposals/${modal.id}/reject`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Could not decline.");
        return;
      }
      void refreshNotifications();
      closeAndAdvance();
    } finally {
      setActing(false);
    }
  };

  if (status !== "authenticated" || !modal) return null;

  const learners = modal.memberDetails.filter((m) => !m.isHelper);
  const learnerLabel =
    learners.length > 0
      ? learners.map((m) => m.name ?? "Peer").join(", ")
      : "Peers";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-proposal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2
              id="match-proposal-title"
              className="font-display text-lg font-semibold text-foreground"
            >
              New match invitation
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{learnerLabel}</span>{" "}
              {learners.length === 1 ? "wants" : "want"} help with{" "}
              <span className="font-medium text-foreground capitalize">
                {modal.subjects.join(", ")}
              </span>
              .
            </p>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive mb-4 rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            disabled={acting}
            onClick={reject}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={accept}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {acting ? "Please wait…" : "Accept & form group"}
          </button>
        </div>

      </div>
    </div>
  );
}
