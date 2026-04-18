import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  notifyHelperNewMatchProposal,
  notifyLearnersOfOneWayMatch,
  notifyMembersOfMutualGroup,
} from "@/lib/notifications";
import { POOL_MIN_WAIT_BEFORE_MATCH_MS } from "@/lib/matching/constants";

export { POOL_MIN_WAIT_BEFORE_MATCH_MS } from "@/lib/matching/constants";

const MAX_GROUP_SIZE = 4;
/** Smallest mutual-help cycle we form (2+ people in the pool). */
const MIN_GROUP_SIZE = 2;
/**
 * Smallest number of waiting-pool rows before we run the engine at all.
 * One row is enough for one-way matching: a single learner in the pool plus a
 * helper who is *not* in the pool (strong subjects only). Previously we required
 * 2+ pool rows, so solo learners never matched and helpers never got proposals.
 */
const MIN_POOL_ROWS_TO_RUN = 1;
const ONE_WAY_PROPOSAL_EXPIRY_MS = 25_000;
const REJECT_COOLDOWN_MS = 35_000;
/** Cap total time spent in cycle DFS per `tryCycleGroups` call (worst-case guard). */
const MAX_DFS_TIME_MS = 200;

/** Higher = matched first; ties broken by earlier `joinedAt` on each pool row. */
const URGENCY_WEIGHT: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// ─── Types ──────────────────────────────────────────────

type PoolEntry = {
  id: string; // waitingPool record id
  userId: string;
  doubtId: string;
  subject: string; // lowercase
  urgency: "HIGH" | "MEDIUM" | "LOW";
  joinedAt: Date;
};

type Graph = Map<string, string[]>; // userId → [userIds they can help]

type BuildGraphResult = {
  graph: Graph;
  /** userId → lowercase strong subjects (for cycle doubt assignment) */
  strongByUser: Map<string, Set<string>>;
};

/** User is considered "busy" only while in a pending proposal. */
type PrismaLike = PrismaClient | Prisma.TransactionClient;

async function findBusyUserIds(db: PrismaLike, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const target = new Set(userIds);
  const now = new Date();

  const pendingProposals = await db.matchProposal.findMany({
    where: {
      status: "PENDING",
      expiresAt: { gt: now },
      members: { hasSome: userIds },
    },
    select: { members: true },
  });

  const busy = new Set<string>();
  for (const p of pendingProposals) {
    for (const id of p.members) {
      if (target.has(id)) busy.add(id);
    }
  }
  return busy;
}

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

    const candidates = pool
      .filter(
      (p) =>
        p.userId === learnerId &&
        !usedPoolEntryIds.has(p.id) &&
        helperStrong.has(p.subject.toLowerCase())
    )
      .sort((a, b) => {
        const urgencyDiff = URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      });

    const pick = candidates[0];

    if (!pick) {
      throw new Error(`No helper-compatible pool entry for cycle member ${learnerId}`);
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
async function buildGraph(
  pool: PoolEntry[],
  options?: { includeExternalHelpers?: boolean }
): Promise<BuildGraphResult> {
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

  // Optionally include external helpers (outside the waiting pool).
  if (options?.includeExternalHelpers !== false) {
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
 * DFS to close a simple directed cycle: start → … → current → start.
 * `path` is mutated and restored on backtrack; on success returns a copy.
 * Prunes dead branches, limits fan-out, and respects `dfsStartDeadline`.
 */
function findCycleDFS(
  graph: Graph,
  poolUserIds: Set<string>,
  start: string,
  current: string,
  visited: Set<string>,
  path: string[],
  targetSize: number,
  dfsStartDeadline: number
): string[] | null {
  if (Date.now() > dfsStartDeadline) return null;

  if (path.length === targetSize) {
    const neighbors = graph.get(current) || [];
    return neighbors.includes(start) ? path.slice() : null;
  }

  const neighbors = (graph.get(current) || []).filter((n) =>
    poolUserIds.has(n)
  );

  for (const next of neighbors) {
    if (visited.has(next)) continue;

    visited.add(next);
    path.push(next);
    const found = findCycleDFS(
      graph,
      poolUserIds,
      start,
      next,
      visited,
      path,
      targetSize,
      dfsStartDeadline
    );
    if (found) return found;
    path.pop();
    visited.delete(next);
  }

  return null;
}

/**
 * Find a mutual-benefit cycle of given size in the pool.
 * A cycle means: A helps B, B helps C, ..., N helps A.
 * Each member must be in the pool (have an active doubt).
 */
function findCycleOfSize(
  graph: Graph,
  poolUserIds: Set<string>,
  size: number,
  dfsStartedAt: number
): string[] | null {
  if (poolUserIds.size < size) return null;

  const dfsStartDeadline = dfsStartedAt + MAX_DFS_TIME_MS;

  // Natural iteration order (no degree-based bias).
  for (const start of poolUserIds) {
    if (Date.now() > dfsStartDeadline) return null;
    const out = graph.get(start);
    if (!out?.some((n) => poolUserIds.has(n))) continue;

    const visited = new Set<string>([start]);
    const path = [start];
    const cycle = findCycleDFS(
      graph,
      poolUserIds,
      start,
      start,
      visited,
      path,
      size,
      dfsStartDeadline
    );
    if (cycle) return cycle;
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
  const dfsStartedAt = Date.now();
  const maxSize = Math.min(MAX_GROUP_SIZE, poolUserIds.size);

  // Prefer mutual cycles of size >= 3 over one-way matching.
  for (let size = maxSize; size >= 3; size--) {
    if (Date.now() - dfsStartedAt > MAX_DFS_TIME_MS) return null;
    const cycle = findCycleOfSize(graph, poolUserIds, size, dfsStartedAt);
    if (cycle) return cycle;
  }

  // Only fall back to size-2 cycles when no size>=3 cycle was found.
  if (poolUserIds.size >= 2) {
    if (Date.now() - dfsStartedAt > MAX_DFS_TIME_MS) return null;
    const cycle2 = findCycleOfSize(graph, poolUserIds, 2, dfsStartedAt);
    if (cycle2) return cycle2;
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

function resolveOneWayLearnerRows(
  helperId: string,
  learnerIds: string[],
  pool: PoolEntry[],
  strongByUser: Map<string, Set<string>>
): { learnerRows: PoolEntry[] } | null {
  const helperStrong = strongByUser.get(helperId);
  if (!helperStrong || helperStrong.size === 0) return null;

  const selectedRows: PoolEntry[] = [];
  const usedRowIds = new Set<string>();

  for (const learnerId of learnerIds) {
    const row = pool
      .filter(
        (p) =>
          p.userId === learnerId &&
          !usedRowIds.has(p.id) &&
          helperStrong.has(p.subject.toLowerCase())
      )
      .sort((a, b) => {
        const urgencyDiff = URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      })[0];

    if (!row) return null;
    selectedRows.push(row);
    usedRowIds.add(row.id);
  }

  return { learnerRows: selectedRows };
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
  // Keep matching responsive by expiring stale proposals before availability checks.
  await prisma.matchProposal.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const poolEntries = await prisma.waitingPool.findMany({
    orderBy: { joinedAt: "asc" },
    include: {
      doubt: { select: { urgency: true } },
    },
  });

  if (poolEntries.length < MIN_POOL_ROWS_TO_RUN) return;

  const cutoff = new Date(Date.now() - POOL_MIN_WAIT_BEFORE_MATCH_MS);

  const pendingProposals = await prisma.matchProposal.findMany({
    where: {
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: { members: true },
  });
  const pendingUserIds = new Set(pendingProposals.flatMap((p) => p.members));

  // STEP 1: Build graph ONLY with pool users, then try cycle detection.
  const eligibleRows = options?.skipPoolMinWait
    ? poolEntries
    : poolEntries.filter((e) => e.joinedAt <= cutoff);

  if (eligibleRows.length < MIN_POOL_ROWS_TO_RUN) return;

  const pool: PoolEntry[] = eligibleRows.map((e) => ({
    id: e.id,
    userId: e.userId,
    doubtId: e.doubtId,
    subject: e.subject.toLowerCase(),
    urgency: e.doubt.urgency,
    joinedAt: e.joinedAt,
  }));

  const availablePool = pool.filter((p) => !pendingUserIds.has(p.userId));
  if (availablePool.length < MIN_POOL_ROWS_TO_RUN) return;

  const CYCLE_ONLY_WINDOW_MS = 30000;
  const now = Date.now();
  const oldestJoinTime = Math.min(
    ...availablePool.map((p) => p.joinedAt.getTime())
  );
  const withinCycleOnlyWindow = now - oldestJoinTime < CYCLE_ONLY_WINDOW_MS;

  // Higher urgency first; same urgency → earlier joinedAt first.
  const sortedPool = [...availablePool].sort((a, b) => {
    const urgencyDiff = URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

  const poolUserIdsFull = new Set(sortedPool.map((p) => p.userId));

  const { graph: poolGraph, strongByUser: poolStrongByUser } =
    await buildGraph(sortedPool, { includeExternalHelpers: false });

  const cycle = tryCycleGroups(poolGraph, poolUserIdsFull);
  if (cycle) {
    // IF cycle found → transaction-safe revalidation + exact row claim.
    const cycleGroup = await prisma.$transaction(async (tx) => {

      const candidateRows = await tx.waitingPool.findMany({
        where: { userId: { in: cycle } },
        include: { doubt: { select: { urgency: true } } },
      });

      // Safety: every cycle member must still have an eligible, unchanged pool row.
      const candidatePool: PoolEntry[] = candidateRows
        .filter((e) => (options?.skipPoolMinWait ? true : e.joinedAt <= cutoff))
        .map((e) => ({
          id: e.id,
          userId: e.userId,
          doubtId: e.doubtId,
          subject: e.subject.toLowerCase(),
          urgency: e.doubt.urgency,
          joinedAt: e.joinedAt,
        }));
      const candidateUserIds = new Set(candidatePool.map((e) => e.userId));
      const allMembersPresent = cycle.every((userId) => candidateUserIds.has(userId));
      if (!allMembersPresent) return null;

      // Safety: do not consume users that got matched elsewhere between read and write.
      const busy = await findBusyUserIds(tx, cycle);
      if (cycle.some((userId) => busy.has(userId))) return null;

      // Re-resolve cycle doubts against current rows, then atomically claim exact rows.
      const { doubtIds: memberDoubtIds, subjects: cycleSubjects } =
        resolveCycleMemberDoubts(cycle, candidatePool, poolStrongByUser);
      const subjects = [...new Set(cycleSubjects)];
      const cycleRowIds = memberDoubtIds
        .map((doubtId) => candidatePool.find((p) => p.doubtId === doubtId)?.id)
        .filter((id): id is string => Boolean(id));

      const claimed = await tx.waitingPool.deleteMany({
        where: { id: { in: cycleRowIds } },
      });
      // Safety: only one concurrent run can claim all intended rows.
      if (claimed.count !== cycleRowIds.length) return null;

      const group = await tx.matchGroup.create({
        data: {
          type: "cycle",
          subjects,
          members: {
            create: cycle.map((userId, i) => ({
              userId,
              doubtId: memberDoubtIds[i]!,
              // Cycle is mutual-help; avoid labeling everyone as one-way "helper".
              role: "learner",
            })),
          },
        },
      });

      return group;
    }, { timeout: 15000 });

    if (!cycleGroup) return;

    const subjects = cycleGroup.subjects;

    void notifyMembersOfMutualGroup({
      groupId: cycleGroup.id,
      memberUserIds: cycle,
      subjects,
    }).catch((err) => {
      console.error("Mutual match notification error:", err);
    });

    return;
  }

  // If still within the initial 30s cycle-only window, do NOT attempt one-way.
  if (withinCycleOnlyWindow) return;

  // ELSE (>= 30s):
  // STEP 3: fetch external helpers
  // STEP 4: build extended graph
  // STEP 5: one-way matching
  const { graph: extendedGraph, strongByUser: extendedStrongByUser } =
    await buildGraph(sortedPool, {
    includeExternalHelpers: true,
  });

  const oneWay = tryOneWayGroup(extendedGraph, poolUserIdsFull);
  if (!oneWay) return;

  const { helperId } = oneWay;
  const limitedLearners = oneWay.learnerIds.slice(0, MAX_GROUP_SIZE - 1);
  const oneWayRows = resolveOneWayLearnerRows(
    helperId,
    limitedLearners,
    sortedPool,
    extendedStrongByUser
  );
  if (!oneWayRows) return;

  const learnerRows = oneWayRows.learnerRows;
  const learnerIds = learnerRows.map((r) => r.userId);
  const allMembers = [helperId, ...learnerIds];
  const doubtIds = learnerRows.map((r) => r.doubtId);
  const subjects = [...new Set(learnerRows.map((r) => r.subject))];
  const expiresAt = new Date(Date.now() + ONE_WAY_PROPOSAL_EXPIRY_MS);

  // ── Safety reads run OUTSIDE the transaction to keep it short ──────────
  const rowIds = learnerRows.map((r) => r.id);
  const canonicalMembers = [helperId, ...learnerIds.slice().sort()];
  const canonicalDoubtIds = doubtIds.slice().sort();

  const [preBusy, existingPending, recentRejected] = await Promise.all([
    findBusyUserIds(prisma, allMembers),
    prisma.matchProposal.findMany({
      where: { type: "one_way", status: "PENDING", helperId, expiresAt: { gt: new Date() } },
      select: { members: true, doubtIds: true },
    }),
    prisma.matchProposal.findMany({
      where: {
        type: "one_way",
        status: "REJECTED",
        helperId,
        updatedAt: { gt: new Date(Date.now() - REJECT_COOLDOWN_MS) },
      },
      select: { members: true, doubtIds: true },
    }),
  ]);

  if (allMembers.some((id) => preBusy.has(id))) return;

  const hasMatchingPending = existingPending.some((p) => {
    const em = p.members.slice().sort();
    const ed = p.doubtIds.slice().sort();
    return (
      em.length === canonicalMembers.length &&
      em.every((m, i) => m === canonicalMembers[i]) &&
      ed.length === canonicalDoubtIds.length &&
      ed.every((d, i) => d === canonicalDoubtIds[i])
    );
  });
  if (hasMatchingPending) return;

  const hasRecentRejectedTwin = recentRejected.some((p) => {
    const rm = p.members.slice().sort();
    const rd = p.doubtIds.slice().sort();
    return (
      rm.length === canonicalMembers.length &&
      rm.every((m, i) => m === canonicalMembers[i]) &&
      rd.length === canonicalDoubtIds.length &&
      rd.every((d, i) => d === canonicalDoubtIds[i])
    );
  });
  if (hasRecentRejectedTwin) return;

  // ── Minimal transaction: verify rows still exist, then create ───────────
  const createdProposal = await prisma.$transaction(async (tx) => {
    const currentRows = await tx.waitingPool.findMany({
      where: { id: { in: rowIds } },
      select: { id: true, userId: true },
    });
    if (currentRows.length !== rowIds.length) return null;
    const rowUserIds = new Set(currentRows.map((r) => r.userId));
    if (!learnerIds.every((id) => rowUserIds.has(id))) return null;

    // Final busy check inside transaction for atomicity.
    const busy = await findBusyUserIds(tx, allMembers);
    if (allMembers.some((id) => busy.has(id))) return null;

    return tx.matchProposal.create({
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
  }, { timeout: 15000 });

  if (!createdProposal) return;

  void notifyHelperNewMatchProposal({
    proposalId: createdProposal.id,
    helperId,
    subjects,
    learnerIds,
  }).catch((err) => {
    console.error("Match proposal notification error:", err);
  });
}

// ─── Proposal Actions ───────────────────────────────────

export async function acceptProposal(proposalId: string, helperId: string) {
  const group = await prisma.$transaction(async (tx) => {
    const proposal = await tx.matchProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal || proposal.status !== "PENDING") {
      throw new Error("Proposal not found or already handled");
    }
    if (proposal.helperId !== helperId) {
      throw new Error("Only the assigned helper can accept");
    }
    if (proposal.expiresAt <= new Date()) {
      await tx.matchProposal.updateMany({
        where: { id: proposalId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      throw new Error("Proposal expired");
    }

    // A proposal is only valid if the referenced doubts are still in the pool.
    const activeRows = await tx.waitingPool.findMany({
      where: { doubtId: { in: proposal.doubtIds } },
      select: { doubtId: true },
    });
    const activeDoubtIds = new Set(activeRows.map((r) => r.doubtId));
    const hasAllDoubts = proposal.doubtIds.every((id) => activeDoubtIds.has(id));
    if (!hasAllDoubts) {
      await tx.matchProposal.updateMany({
        where: { id: proposalId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      throw new Error("Proposal is no longer valid");
    }

    // Safety: compare-and-set avoids double accept on concurrent clicks.
    const accepted = await tx.matchProposal.updateMany({
      where: { id: proposalId, status: "PENDING", helperId },
      data: { status: "ACCEPTED" },
    });
    if (accepted.count !== 1) {
      throw new Error("Proposal not found or already handled");
    }

    // Create the match group
    const learnerIds = proposal.members.filter((id) => id !== helperId);
    const created = await tx.matchGroup.create({
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
      where: { doubtId: { in: proposal.doubtIds } },
    });

    return created;
  });

  const learnerIds = group.members
    .filter((m) => m.role === "learner")
    .map((m) => m.userId);

  void notifyLearnersOfOneWayMatch({
    groupId: group.id,
    helperId,
    learnerIds,
    subjects: group.subjects,
  }).catch((err) => {
    console.error("One-way match learner notification error:", err);
  });

  return group;
}

export async function rejectProposal(proposalId: string, helperId: string) {
  const rejected = await prisma.matchProposal.updateMany({
    where: { id: proposalId, status: "PENDING", helperId },
    data: { status: "REJECTED" },
  });
  if (rejected.count !== 1) {
    throw new Error("Proposal not found or already handled");
  }

  // Everyone stays in pool — try matching again
  await triggerMatching();
}

export async function removeOwnDoubtFromWaitingPool(
  userId: string,
  doubtId: string
): Promise<boolean> {
  const removed = await prisma.waitingPool.deleteMany({
    where: { userId, doubtId },
  });

  // If a pending proposal references this doubt, it is no longer valid.
  if (removed.count > 0) {
    await prisma.matchProposal.updateMany({
      where: {
        status: "PENDING",
        doubtIds: { has: doubtId },
      },
      data: { status: "EXPIRED" },
    });
  }

  return removed.count > 0;
}
