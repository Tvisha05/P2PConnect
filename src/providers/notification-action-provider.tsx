"use client";

import { createContext, useCallback, useContext } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/providers/notification-provider";
import { ProposalActionToast } from "@/components/matching/proposal-action-toast";
import { MutualMatchToast } from "@/components/matching/mutual-match-toast";
import type { NotificationItem } from "@/types";

type NotificationActionContextType = {
  openDialog: (notif: NotificationItem) => void;
};

const NotificationActionContext = createContext<NotificationActionContextType>({
  openDialog: () => {},
});

export function useNotificationAction() {
  return useContext(NotificationActionContext);
}

function extractProposalId(linkUrl: string | null | undefined): string | null {
  if (!linkUrl) return null;
  try {
    const url = new URL(linkUrl, "http://x");
    return url.searchParams.get("focusProposal");
  } catch {
    return null;
  }
}

export function NotificationActionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refresh } = useNotifications();

  const openDialog = useCallback(
    (notif: NotificationItem) => {
      if (notif.type === "MATCH_PROPOSAL") {
        const proposalId = extractProposalId(notif.linkUrl);
        if (!proposalId) {
          toast.error("Proposal not found — it may have expired.");
          return;
        }
        toast.custom(
          (t) => (
            <ProposalActionToast
              toastId={t}
              proposalId={proposalId}
              learnerNames={notif.sender?.name ?? "A peer"}
              subjects={[]}
            />
          ),
          { id: `proposal-notif-${notif.id}`, duration: Infinity }
        );
        void refresh();
        return;
      }

      if (notif.type === "MUTUAL_MATCH") {
        toast.custom(
          (t) => (
            <MutualMatchToast
              toastId={t}
              notifId={notif.id}
              title={notif.title}
              body={notif.body}
              groupUrl={notif.linkUrl ?? null}
            />
          ),
          { id: `mutual-notif-${notif.id}`, duration: Infinity }
        );
      }
    },
    [refresh]
  );

  return (
    <NotificationActionContext.Provider value={{ openDialog }}>
      {children}
    </NotificationActionContext.Provider>
  );
}
