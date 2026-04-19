import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma";
import { pushProposalSignal, pushNotificationSignal } from "@/lib/realtime";

type CreateNotificationInput = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
  senderId?: string | null;
  dedupeKey?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  if (input.dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        recipientId: input.recipientId,
        type: input.type,
        linkUrl: input.linkUrl ?? null,
      },
      select: { id: true },
    });
    if (existing) return existing;
  }

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
  const topicLine = subjects.length > 0 ? subjects.join(", ") : "peer learning";

  await createNotification({
    recipientId: helperId,
    type: "MATCH_PROPOSAL",
    title: "New match invitation",
    body: `${names} asked for help with: ${topicLine}. Accept or decline to form your group.`,
    linkUrl: `/doubts/new?focusProposal=${proposalId}`,
    dedupeKey: `proposal:${proposalId}`,
  });
  await pushProposalSignal(helperId, proposalId).catch(() => {});
}

export async function notifyLearnersOfOneWayMatch(params: {
  groupId: string;
  helperId: string;
  learnerIds: string[];
  subjects: string[];
}) {
  const { groupId, helperId, learnerIds, subjects } = params;
  if (learnerIds.length === 0) return;

  const helper = await prisma.user.findUnique({
    where: { id: helperId },
    select: { name: true },
  });
  const helperName = helper?.name ?? "A peer";
  const topicLine = subjects.length > 0 ? subjects.join(", ") : "your question";

  await Promise.all(
    learnerIds.map((learnerId) =>
      createNotification({
        recipientId: learnerId,
        senderId: helperId,
        type: "MUTUAL_MATCH",
        title: "You've been matched!",
        body: `${helperName} accepted to help you with: ${topicLine}. Open the group to start chatting.`,
        linkUrl: `/groups/${groupId}`,
        dedupeKey: `group:${groupId}:learner:${learnerId}`,
      })
    )
  );
  void Promise.all(learnerIds.map((id) => pushNotificationSignal(id))).catch(() => {});
}

export async function notifyHelpersOfNewDoubt(params: {
  doubtId: string;
  subject: string;
  title: string;
  seekerId: string;
}) {
  const { doubtId, subject, title, seekerId } = params;

  const helpers = await prisma.academicProfile.findMany({
    where: {
      subjectAffinities: {
        some: { subject: { equals: subject, mode: "insensitive" } },
      },
      userId: { not: seekerId },
    },
    select: { userId: true },
  });

  if (helpers.length === 0) return;

  // Skip helpers already notified for this exact doubt.
  const existingRecipients = await prisma.notification.findMany({
    where: {
      type: "TAG_NEW_DOUBT",
      linkUrl: `/doubts/${doubtId}`,
      recipientId: { in: helpers.map((h) => h.userId) },
    },
    select: { recipientId: true },
  });
  const alreadyNotified = new Set(existingRecipients.map((n) => n.recipientId));
  const toNotify = helpers.filter((h) => !alreadyNotified.has(h.userId));

  if (toNotify.length === 0) return;

  await prisma.notification.createMany({
    data: toNotify.map(({ userId }) => ({
      recipientId: userId,
      senderId: seekerId,
      type: "TAG_NEW_DOUBT" as NotificationType,
      title: `New doubt in ${subject}`,
      body: title,
      linkUrl: `/doubts/${doubtId}`,
    })),
  });
  void Promise.all(toNotify.map(({ userId }) => pushNotificationSignal(userId))).catch(() => {});
}

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
  const topicLine = subjects.length > 0 ? subjects.join(", ") : "your subjects";

  await Promise.all(
    memberUserIds.map((userId) => {
      const others = memberUserIds
        .filter((id) => id !== userId)
        .map((id) => nameById.get(id) ?? "Peer")
        .join(", ");
      return createNotification({
        recipientId: userId,
        type: "MUTUAL_MATCH",
        title: "New mutual help group",
        body: `You're matched with ${others} for: ${topicLine}. Open the group to coordinate.`,
        linkUrl: `/groups/${groupId}`,
        dedupeKey: `group:${groupId}:member:${userId}`,
      });
    })
  );
  void Promise.all(memberUserIds.map((id) => pushNotificationSignal(id))).catch(() => {});
}
