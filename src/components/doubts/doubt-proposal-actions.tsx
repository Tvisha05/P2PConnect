"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useNotifications } from "@/providers/notification-provider";

type Proposal = {
  id: string;
  subjects: string[];
  doubtIds: string[];
  memberDetails: { id: string; name: string | null; isHelper: boolean }[];
};

type MutualNotif = {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
};

export function DoubtProposalActions({ doubtId }: { doubtId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const { markAsRead, refresh } = useNotifications();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [mutual, setMutual] = useState<MutualNotif | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function load() {
      try {
        const [propRes, notifRes] = await Promise.all([
          fetch("/api/matching/proposals", { cache: "no-store" }),
          fetch("/api/notifications?limit=30", {
            credentials: "same-origin",
            cache: "no-store",
          }),
        ]);

        if (propRes.ok) {
          const data = await propRes.json();
          const match: Proposal | undefined = (data.proposals ?? []).find(
            (p: Proposal) => p.doubtIds.includes(doubtId)
          );
          setProposal(match ?? null);
        }

        if (notifRes.ok) {
          const data = await notifRes.json();
          const matchNotif = (
            data.items as {
              type: string;
              isRead: boolean;
              linkUrl: string | null;
              id: string;
              title: string;
              body: string;
            }[]
          ).find((n) => n.type === "MUTUAL_MATCH" && !n.isRead);
          setMutual(matchNotif ?? null);
        }
      } catch {
        // ignore
      }
    }

    void load();
  }, [status, doubtId]);

  const acceptProposal = async () => {
    if (!proposal) return;
    setActing(true);
    try {
      const res = await fetch(`/api/matching/proposals/${proposal.id}/accept`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not accept.");
        setActing(false);
        return;
      }
      toast.success("Group formed!");
      void refresh();
      setProposal(null);
      if (j.group?.id) router.push(`/groups/${j.group.id}`);
    } catch {
      toast.error("Network error. Please try again.");
      setActing(false);
    }
  };

  const declineProposal = async () => {
    if (!proposal) return;
    setActing(true);
    try {
      await fetch(`/api/matching/proposals/${proposal.id}/reject`, {
        method: "POST",
      });
    } catch {
      // best-effort
    }
    toast.success("Proposal declined.");
    void refresh();
    setProposal(null);
    setActing(false);
  };

  const openGroup = async () => {
    if (!mutual?.linkUrl) return;
    const url = mutual.linkUrl;
    await markAsRead([mutual.id]);
    void refresh();
    router.push(url);
  };

  if (status !== "authenticated") return null;
  if (!proposal && !mutual) return null;

  const learners = proposal?.memberDetails.filter((m) => !m.isHelper) ?? [];
  const learnerLabel =
    learners.length > 0
      ? learners.map((m) => m.name ?? "Peer").join(", ")
      : "Peers";

  return (
    <div className="mb-5 rounded-2xl border-2 border-primary/40 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      {proposal ? (
        <>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                You have a match invitation for this doubt
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{learnerLabel}</span>{" "}
                {learners.length === 1 ? "wants" : "want"} help with{" "}
                <span className="font-medium text-foreground capitalize">
                  {proposal.subjects.join(", ")}
                </span>
                . Accept to form a group and start helping.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled={acting}
              onClick={() => void declineProposal()}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => void acceptProposal()}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm shadow-primary/20"
            >
              {acting ? "Please wait…" : "Accept & form group"}
            </button>
          </div>
        </>
      ) : mutual ? (
        <>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{mutual.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{mutual.body}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void openGroup()}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 shrink-0"
          >
            Open group
          </button>
        </>
      ) : null}
    </div>
  );
}
