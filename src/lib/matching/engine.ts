import { prisma } from "@/lib/prisma";
import {
  notifyHelperNewMatchProposal,
  notifyMembersOfMutualGroup,
} from "@/lib/notifications";
import { POOL_MIN_WAIT_BEFORE_MATCH_MS } from "@/lib/matching/constants";

export { POOL_MIN_WAIT_BEFORE_MATCH_MS } from "@/lib/matching/constants";

const MAX_GROUP_SIZE = 5;
/** Smallest mutual-help cycle we form (2+ people in the pool). */
const MIN_GROUP_SIZE = 2;
/**
 * Smallest number of waiting-pool rows before we run the engine at all.
 * One row is enough for one-way matching: a single learner in the pool plus a
 * helper who is *not* in the pool (strong subjects only). Previously we required
 * 2+ pool rows, so solo learners never matched and helpers never got proposals.
 */
const MIN_POOL_ROWS_TO_RUN = 1;
const PROPOSAL_EXPIRY_MINUTES = 5;

// ─── Types ──────────────────────────────────────────────

type PoolEntry = {
  id: string; // waitingPool record id
  userId: string;
  doubtId: string;
  subject: string; // lowercase
};

type Graph = Map<string, string[]>; // userId → [userIds they can help]

type BuildGraphResult = {
  graph: Graph;
  /** userId → lowercase strong subjects (for cycle doubt assignment) */
  strongByUser: Map<string, Set<string>>;
};

/**
 * For a cycle [U0, U1, …], member Ui is helped by U(i-1). Pick each member's pool row
 * so the helper before them actually covers that row's subject (not just `.find()` first row).
 */
function resolveCycleMemberDoubts(
  cycle: string[],
  pool: PoolEntry[],
  strongByUser: Map<string, Set<string>>
): { doubtIds: string[]; subjects: string[] } {
  const n = cycle.length;
  const usedPoolEntryIds = new Set<string>();
  const doubtIds: string[] = [];
  const subjects: string[] = [];

  for (let i = 0; i < n; i++) {
    const learnerId = cycle[i]!;
    const helperId = cycle[(i - 1 + n) % n]!;
    const helperStrong = strongByUser.get(helperId) ?? new Set();

    const candidates = pool.filter(
      (p) =>
        p.userId === learnerId &&
        !usedPoolEntryIds.has(p.id) &&
        helperStrong.has(p.subject.toLowerCase())
    );

    const pick =
      candidates[0] ??
      pool.find((p) => p.userId === learnerId && !usedPoolEntryIds.has(p.id));

    if (!pick) {
      throw new Error(`No pool entry for cycle member ${learnerId}`);
    }

    usedPoolEntryIds.add(pick.id);
    doubtIds.push(pick.doubtId);
    subjects.push(pick.subject);
  }

  return { doubtIds, subjects };
}

// ─── Graph Building ─────────────────────────────────────

/**
 * Build directed graph: edge from A → B means A has a strong subject
 * that matches B's doubt subject (A can help B).
 */
async function buildGraph(pool: PoolEntry[]): Promise<BuildGraphResult> {
  const graph: Graph = new Map();
  const userIds = [...new Set(pool.map((p) => p.userId))];

  // Fetch strong subjects for all users in pool
  const profiles = await prisma.academicProfile.findMany({
    where: { userId: { in: userIds } },
    include: { subjectAffinities: true },
  });

  // Map userId → set of strong subjects (lowercase)
  const strongMap = new Map<string, Set<string>>();
  for (const profile of profiles) {
    const subjects = new Set(
      profile.subjectAffinities.map((a) => a.subject.toLowerCase())
    );
    strongMap.set(profile.userId, subjects);
  }

  // Also fetch strong subjects from ALL users (not just pool) who could help
  const allHelpers = await prisma.academicProfile.findMany({
    where: {
      subjectAffinities: {
        some: {
          subject: {
            in: pool.map((p) => p.subject),
            mode: "insensitive",
          },
        },
      },
    },
    include: { subjectAffinities: true },
  });

  for (const helper of allHelpers) {
    if (!strongMap.has(helper.userId)) {
      const subjects = new Set(
        helper.subjectAffinities.map((a) => a.subject.toLowerCase())
      );
      strongMap.set(helper.userId, subjects);
    }
  }

  // Build edges: for each pool entry, find who can help (strong in their doubt subject)
  // Edge: helper → learner (helper has strong subject matching learner's doubt)
  for (const entry of pool) {
    const learnerId = entry.userId;
    const doubtSubject = entry.subject.toLowerCase();

    for (const [helperId, strongSubjects] of strongMap) {
      if (helperId === learnerId) continue;
      if (strongSubjects.has(doubtSubject)) {
        const existing = graph.get(helperId) || [];
        if (!existing.includes(learnerId)) {
          existing.push(learnerId);
          graph.set(helperId, existing);
        }
      }
    }
  }

  return { graph, strongByUser: strongMap };
}

// ─── Cycle Detection ────────────────────────────────────

/**
 * Find a mutual-benefit cycle of given size in the pool.
 * A cycle means: A helps B, B helps C, ..., N helps A.
 * Each member must be in the pool (have an active doubt).
 */
function findCycleOfSize(
  graph: Graph,
  poolUserIds: Set<string>,
  size: number
): string[] | null {
  const users = [...poolUserIds];
  if (users.length < size) return null;

  // Generate combinations of `size` users from pool
  const combos = combinations(users, size);

  for (const combo of combos) {
    // Try all permutations to find a valid cycle
    const perms = permutations(combo);
    for (const perm of perms) {
      let valid = true;
      for (let i = 0; i < size; i++) {
        const curr = perm[i];
        const next = perm[(i + 1) % size];
        const neighbors = graph.get(curr) || [];
        if (!neighbors.includes(next)) {
          valid = false;
          break;
        }
      }
      if (valid) return perm;
    }
  }

  return null;
}

/**
 * Try to form cycle groups, largest first (5 → 4 → 3 → 2).
 */
function tryCycleGroups(
  graph: Graph,
  poolUserIds: Set<string>
): string[] | null {
  const maxSize = Math.min(MAX_GROUP_SIZE, poolUserIds.size);
  for (let size = maxSize; size >= MIN_GROUP_SIZE; size--) {
    const cycle = findCycleOfSize(graph, poolUserIds, size);
    if (cycle) return cycle;
  }
  return null;
}

// ─── One-Way Helper Groups ──────────────────────────────

/**
 * Find a one-way helper group: one helper who can help multiple learners.
 * Returns { helperId, learnerIds } or null.
 */
function tryOneWayGroup(
  graph: Graph,
  poolUserIds: Set<string>
): { helperId: string; learnerIds: string[] } | null {
  // Try helpers with the most learners first
  const candidates: { helperId: string; learnerIds: string[] }[] = [];

  for (const [helperId, neighbors] of graph) {
    const learners = neighbors.filter((id) => poolUserIds.has(id));
    if (learners.length > 0) {
      candidates.push({ helperId, learnerIds: learners });
    }
  }

  // Sort by number of learners (descending) — prefer larger groups
  candidates.sort((a, b) => b.learnerIds.length - a.learnerIds.length);

  return candidates[0] || null;
}

// ─── Main Matching Logic ────────────────────────────────

/**
 * Run the matching engine. Called whenever a new doubt is posted.
 * Creates MatchProposals for helpers to accept/reject.
 */
export async function triggerMatching(options?: {
  /** Set true in scripts/tests; app always uses the 30s pool wait. */
  skipPoolMinWait?: boolean;
}): Promise<void> {
  // Fetch current waiting pool
  const poolEntries = await prisma.waitingPool.findMany({
    orderBy: { joinedAt: "asc" },
  });

  if (poolEntries.length < MIN_POOL_ROWS_TO_RUN) return;

  const cutoff = new Date(Date.now() - POOL_MIN_WAIT_BEFORE_MATCH_MS);
  const eligibleRows = options?.skipPoolMinWait
    ? poolEntries
    : poolEntries.filter((e) => e.joinedAt <= cutoff);

  if (eligibleRows.length < MIN_POOL_ROWS_TO_RUN) return;

  const pool: PoolEntry[] = eligibleRows.map((e) => ({
    id: e.id,
    userId: e.userId,
    doubtId: e.doubtId,
    subject: e.subject.toLowerCase(),
  }));

  // Don't match users who already have pending proposals
  const pendingProposals = await prisma.matchProposal.findMany({
    where: { status: "PENDING" },
    select: { members: true },
  });
  const pendingUserIds = new Set(pendingProposals.flatMap((p) => p.members));
  const availablePool = pool.filter((p) => !pendingUserIds.has(p.userId));

  if (availablePool.length < MIN_POOL_ROWS_TO_RUN) return;

  const { graph, strongByUser } = await buildGraph(availablePool);
  const poolUserIds = new Set(availablePool.map((p) => p.userId));

  const expiresAt = new Date(Date.now() + PROPOSAL_EXPIRY_MINUTES * 60 * 1000);

  // Step 1: Try cycle groups
  const cycle = tryCycleGroups(graph, poolUserIds);
  if (cycle) {
    // In a cycle, everyone is both helper and learner — auto-form the group.
    // Each user may have multiple pool rows; pick the row whose subject the *previous*
    // person in the cycle can actually help with (e.g. B has os + dbms but only dbms
    // matches A's strong subjects → attach dbms, not the first row "os").
    const { doubtIds: memberDoubtIds, subjects: cycleSubjects } =
      resolveCycleMemberDoubts(cycle, availablePool, strongByUser);
    const subjects = [...new Set(cycleSubjects)];

    // Cycle groups are auto-accepted (everyone benefits mutually)
    const cycleGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.matchGroup.create({
        data: {
          type: "cycle",
          subjects,
          members: {
            create: cycle.map((userId, i) => ({
              userId,
              doubtId: memberDoubtIds[i]!,
              role: "helper", // everyone is both
            })),
          },
        },
      });

      await tx.waitingPool.deleteMany({
        where: { userId: { in: cycle } },
      });

      return group;
    });

    try {
      await notifyMembersOfMutualGroup({
        groupId: cycleGroup.id,
        memberUserIds: cycle,
        subjects,
      });
    } catch (err) {
      console.error("Mutual match notification error:", err);
    }

    // Recursively try more matches with remaining pool
    return triggerMatching(options);
  }

  // Step 2: Try one-way helper groups
  const oneWay = tryOneWayGroup(graph, poolUserIds);
  if (oneWay) {
    const { helperId, learnerIds } = oneWay;
    const allMembers = [helperId, ...learnerIds];
    const doubtIds = learnerIds.map((id) => {
      const entry = availablePool.find((p) => p.userId === id);
      return entry!.doubtId;
    });
    const subjects = [
      ...new Set(
        learnerIds.map((id) => {
          const entry = availablePool.find((p) => p.userId === id);
          return entry!.subject;
        })
      ),
    ];

    // Create proposal — only helper needs to confirm
    const createdProposal = await prisma.matchProposal.create({
      data: {
        type: "one_way",
        status: "PENDING",
        members: allMembers,
        doubtIds,
        subjects,
        helperId,
        expiresAt,
      },
    });

    try {
      await notifyHelperNewMatchProposal({
        proposalId: createdProposal.id,
        helperId,
        subjects,
        learnerIds,
      });
    } catch (err) {
      console.error("Match proposal notification error:", err);
    }
  }
}

// ─── Proposal Actions ───────────────────────────────────

export async function acceptProposal(proposalId: string, helperId: string) {
  const proposal = await prisma.matchProposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal || proposal.status !== "PENDING") {
    throw new Error("Proposal not found or already handled");
  }
  if (proposal.helperId !== helperId) {
    throw new Error("Only the assigned helper can accept");
  }

  return prisma.$transaction(async (tx) => {
    // Update proposal status
    await tx.matchProposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED" },
    });

    // Create the match group
    const learnerIds = proposal.members.filter((id) => id !== helperId);
    const group = await tx.matchGroup.create({
      data: {
        type: "one_way",
        subjects: proposal.subjects,
        members: {
          create: [
            { userId: helperId, role: "helper" },
            ...learnerIds.map((userId, i) => ({
              userId,
              doubtId: proposal.doubtIds[i] || null,
              role: "learner" as const,
            })),
          ],
        },
      },
      include: { members: true },
    });

    // Remove learners from waiting pool (helper stays for future matches)
    await tx.waitingPool.deleteMany({
      where: { userId: { in: learnerIds } },
    });

    return group;
  });
}

export async function rejectProposal(proposalId: string, helperId: string) {
  const proposal = await prisma.matchProposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal || proposal.status !== "PENDING") {
    throw new Error("Proposal not found or already handled");
  }
  if (proposal.helperId !== helperId) {
    throw new Error("Only the assigned helper can reject");
  }

  await prisma.matchProposal.update({
    where: { id: proposalId },
    data: { status: "REJECTED" },
  });

  // Everyone stays in pool — try matching again
  await triggerMatching();
}

// ─── Utility: Combinations & Permutations ───────────────

function combinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (arr.length < size) return [];

  const result: T[][] = [];
  for (let i = 0; i <= arr.length - size; i++) {
    const rest = combinations(arr.slice(i + 1), size - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];

  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = permutations(rest);
    for (const perm of perms) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}
