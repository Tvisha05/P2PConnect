"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useNotifications } from "@/providers/notification-provider";
import { ProposalActionToast } from "@/components/matching/proposal-action-toast";

const POLL_MS = 800;

type MemberDetail = {
  id: string;
  name: string | null;
  image: string | null;
  isHelper: boolean;
};

type ApiProposal = {
  id: string;
  subjects: string[];
  expiresAt: string;
  memberDetails: MemberDetail[];
};

export function MatchProposalAlerts() {
  const { data: session, status } = useSession();
  const { refresh: refreshNotifications } = useNotifications();
  const inFlightRef = useRef(false);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  const showProposalToast = useCallback(
    (proposal: ApiProposal) => {
      const learners = proposal.memberDetails.filter((m) => !m.isHelper);
      const learnerNames =
        learners.length > 0
          ? learners.map((m) => m.name ?? "Peer").join(", ")
          : "Peers";

      toast.custom(
        (t) => (
          <ProposalActionToast
            toastId={t}
            proposalId={proposal.id}
            learnerNames={learnerNames}
            subjects={proposal.subjects}
          />
        ),
        {
          id: `proposal-${proposal.id}`,
          duration: Infinity,
        }
      );

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.visibilityState === "hidden"
      ) {
        try {
          new Notification("PeerConnect — Match invitation", {
            body: `${learnerNames} need help with: ${proposal.subjects.join(", ")}`,
            tag: `proposal-${proposal.id}`,
          });
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const poll = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const res = await fetch("/api/matching/proposals", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: ApiProposal[] = data.proposals ?? [];

      let hasNew = false;
      for (const p of list) {
        if (!alertedIdsRef.current.has(p.id)) {
          alertedIdsRef.current.add(p.id);
          showProposalToast(p);
          hasNew = true;
        }
      }
      if (hasNew) void refreshNotifications();
    } catch {
      // ignore transient errors
    } finally {
      inFlightRef.current = false;
    }
  }, [session?.user?.id, status, showProposalToast, refreshNotifications]);

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

  return null;
}
