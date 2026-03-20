import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await prisma.matchGroup.findUnique({
    where: { id: groupId },
    select: { subjects: true },
  });
  return {
    title: group ? `${group.subjects.join(", ")} — Group` : "Group — Peer Connect",
  };
}

export default async function GroupChatPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { groupId } = await params;

  // Check membership
  const membership = await prisma.matchGroupMember.findUnique({
    where: {
      matchGroupId_userId: {
        matchGroupId: groupId,
        userId: session.user.id,
      },
    },
  });
  if (!membership) notFound();

  // Fetch group with members
  const group = await prisma.matchGroup.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group) notFound();

  const userIds = group.members.map((m) => m.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const members = group.members.map((m) => ({
    id: m.userId,
    name: userMap[m.userId]?.name ?? "Unknown",
    image: userMap[m.userId]?.image ?? null,
    role: m.role,
  }));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <Link
              href="/groups"
              className="h-9 w-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
            >
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl font-semibold text-foreground capitalize">
                  {group.subjects.join(", ")}
                </h1>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    group.type === "cycle"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                  }`}
                >
                  {group.type === "cycle" ? "Mutual Help" : "One-Way Help"}
                </span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(group.createdAt.toISOString())}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {members.length} members — you are{" "}
                {membership.role === "helper" ? "helping" : "learning"}.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Members</h2>
            <div className="flex flex-wrap gap-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                    m.id === session.user.id
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold border ${
                      m.id === session.user.id ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border"
                    }`}
                    title={`${m.name} (${m.role})`}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{m.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
