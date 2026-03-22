import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma";

type CreateNotificationInput = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
  senderId?: string | null;
};

/**
 * Persist an in-app notification (server-only).
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      senderId: input.senderId ?? undefined,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? undefined,
    },
  });
}

/**
 * Notify the helper as soon as a one-way match proposal is created.
 */
export async function notifyHelperNewMatchProposal(params: {
  proposalId: string;
  helperId: string;
  subjects: string[];
  learnerIds: string[];
}) {
  const { proposalId, helperId, subjects, learnerIds } = params;

  const learners = await prisma.user.findMany({
    where: { id: { in: learnerIds } },
    select: { name: true },
  });
  const names = learners.map((u) => u.name ?? "A peer").join(", ");
  const topicLine =
    subjects.length > 0 ? subjects.join(", ") : "peer learning";

  await createNotification({
    recipientId: helperId,
    type: "MATCH_PROPOSAL",
    title: "New match invitation",
    body: `${names} asked for help with: ${topicLine}. Accept or decline to form your group.`,
    linkUrl: `/doubts/new?focusProposal=${proposalId}`,
  });
}

/**
 * When a mutual (cycle) group is auto-formed, every member gets an in-app notification.
 * One-way flows use MATCH_PROPOSAL + helper-only notify instead.
 */
export async function notifyMembersOfMutualGroup(params: {
  groupId: string;
  memberUserIds: string[];
  subjects: string[];
}) {
  const { groupId, memberUserIds, subjects } = params;
  if (memberUserIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: memberUserIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name ?? "Peer"]));
  const topicLine =
    subjects.length > 0 ? subjects.join(", ") : "your subjects";

  for (const userId of memberUserIds) {
    const others = memberUserIds
      .filter((id) => id !== userId)
      .map((id) => nameById.get(id) ?? "Peer")
      .join(", ");

    await createNotification({
      recipientId: userId,
      type: "MUTUAL_MATCH",
      title: "New mutual help group",
      body: `You’re matched with ${others} for: ${topicLine}. Open the group to coordinate.`,
      linkUrl: `/groups/${groupId}`,
    });
  }
}
