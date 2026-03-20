"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GroupList } from "@/components/matching/group-list";

type ApiGroup = {
  id: string;
  type: string;
  subjects: string[];
  myRole: string;
  createdAt: string | Date;
  members: Array<{
    id: string;
    name: string | null;
    image: string | null;
    role: string;
    doubtId?: string | null;
  }>;
};

type ApiWaitingPoolEntry = {
  id: string;
  userId: string;
  doubt?: {
    id: string;
    title: string;
    subject: string;
    urgency?: "LOW" | "MEDIUM" | "HIGH";
  } | null;
};

type Props = {
  currentUserId: string;
  variant: "dashboard" | "groups";
};

function normalizeGroup(group: ApiGroup) {
  const createdAt =
    typeof group.createdAt === "string"
      ? group.createdAt
      : group.createdAt instanceof Date
        ? group.createdAt.toISOString()
        : new Date(group.createdAt).toISOString();

  return {
    id: group.id,
    type: group.type,
    subjects: group.subjects,
    myRole: group.myRole,
    createdAt,
    messageCount: 0,
    members: group.members.map((m) => ({
      id: m.id,
      name: m.name ?? "Unknown",
      image: m.image ?? null,
      role: m.role,
    })),
  };
}

export function RealtimeGroupsPanel({ currentUserId, variant }: Props) {
  const [groups, setGroups] = useState<Array<ReturnType<typeof normalizeGroup>>>([]);
  const [waitingPool, setWaitingPool] = useState<ApiWaitingPoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<number | null>(null);

  const showEmptyCta = variant === "groups";

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const [groupsRes, poolRes] = await Promise.all([
          fetch("/api/matching/groups"),
          fetch("/api/matching/pool"),
        ]);

        if (!groupsRes.ok) return;

        const groupsJson = await groupsRes.json();
        const poolJson = poolRes.ok ? await poolRes.json() : null;

        if (cancelled) return;

        const nextGroups: ApiGroup[] = groupsJson?.groups ?? [];
        const nextWaiting: ApiWaitingPoolEntry[] = (poolJson?.pool ?? []).filter(
          (e: ApiWaitingPoolEntry) => e.userId === currentUserId
        );

        setGroups(nextGroups.map(normalizeGroup));
        setWaitingPool(nextWaiting);
      } catch {
        // Keep last known state on transient errors.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    pollRef.current = window.setInterval(fetchAll, 3000);

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [currentUserId]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [groups]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
          {variant === "dashboard" ? "Matched Groups" : "My Groups"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Real-time updates as your pool matches.
        </p>
      </div>

      {/* Waiting status */}
      {waitingPool.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
            Waiting for match...
          </h2>
          <div className="space-y-2">
            {waitingPool.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 text-sm text-foreground">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  <strong>{entry.doubt?.subject ?? "Unknown"}</strong>
                  {entry.doubt?.title ? ` — ${entry.doubt.title}` : null}
                </span>
                {entry.doubt?.urgency ? (
                  <span
                    className={[
                      "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      entry.doubt.urgency === "LOW"
                        ? "bg-urgency-low/10 text-urgency-low border-urgency-low/20"
                        : entry.doubt.urgency === "MEDIUM"
                          ? "bg-urgency-medium/10 text-urgency-medium border-urgency-medium/20"
                          : "bg-urgency-high/10 text-urgency-high border-urgency-high/20",
                    ].join(" ")}
                  >
                    {entry.doubt.urgency === "LOW"
                      ? "Low"
                      : entry.doubt.urgency === "MEDIUM"
                        ? "Medium"
                        : "High"}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading && sortedGroups.length === 0 ? (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-muted mb-4">
            <svg
              className="h-5 w-5 animate-spin text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Syncing matches...</p>
        </div>
      ) : (
        <GroupList groups={sortedGroups} currentUserId={currentUserId} showEmptyCta={showEmptyCta} />
      )}
    </div>
  );
}

