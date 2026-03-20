"use client";

import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

type GroupMember = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

type Group = {
  id: string;
  type: string;
  subjects: string[];
  myRole: string;
  createdAt: string;
  messageCount?: number;
  members: GroupMember[];
};

export function GroupList({
  groups,
  currentUserId,
  showEmptyCta = true,
}: {
  groups: Group[];
  currentUserId: string;
  showEmptyCta?: boolean;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-5">
          <svg
            className="h-7 w-7 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground mb-1">
          No groups yet
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          Add a doubt topic to the pool to get matched with peers who can help.
        </p>
        {showEmptyCta ? (
          <Link
            href="/doubts/new"
            className="inline-flex rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add Topic to Pool
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const otherMembers = group.members.filter((m) => m.id !== currentUserId);
        const messageCount = group.messageCount ?? 0;

        return (
          <Link
            key={group.id}
            href={`/groups/${group.id}`}
            className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300"
          >
            {/* Type badge + time */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    group.type === "cycle"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                  }`}
                >
                  {group.type === "cycle" ? "Mutual Help" : "One-Way Help"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(group.createdAt)}
                </span>
              </div>
              {messageCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {messageCount} message{messageCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Subjects */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {group.subjects.map((subject) => (
                <span
                  key={subject}
                  className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium capitalize"
                >
                  {subject}
                </span>
              ))}
            </div>

            {/* Members */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {group.members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-semibold text-muted-foreground"
                    title={`${member.name} (${member.role})`}
                  >
                    {member.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {otherMembers.map((m) => m.name).join(", ")}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
