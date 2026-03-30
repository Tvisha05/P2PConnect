import { prisma } from "@/lib/prisma";
import {
  notifyHelperNewMatchProposal,
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
const PROPOSAL_EXPIRY_MINUTES = 5;
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

// ─── Main Matching Logic ────────────────────────────────

/**
 * Run the matching engine. Called whenever a new doubt is posted.
 * Creates MatchProposals for helpers to accept/reject.
 */
export async function triggerMatching(options?: {
  /** Set true in scripts/tests; app always uses the 30s pool wait. */
  skipPoolMinWait?: boolean;
}): Promise<void> {
  let poolEntries = await prisma.waitingPool.findMany({
    orderBy: { joinedAt: "asc" },
    include: {
      doubt: { select: { urgency: true } },
    },
  });

  if (poolEntries.length < MIN_POOL_ROWS_TO_RUN) return;

  const cutoff = new Date(Date.now() - POOL_MIN_WAIT_BEFORE_MATCH_MS);

  const pendingProposals = await prisma.matchProposal.findMany({
    where: { status: "PENDING" },
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

  /** First row per user in urgency sort order — same as `sortedPool.find(p => p.userId === id)`. */
  const userToPoolEntry = new Map<string, PoolEntry>();
  for (const p of sortedPool) {
    if (!userToPoolEntry.has(p.userId)) userToPoolEntry.set(p.userId, p);
  }

  const poolUserIdsFull = new Set(sortedPool.map((p) => p.userId));

  const { graph: poolGraph, strongByUser: poolStrongByUser } =
    await buildGraph(sortedPool, { includeExternalHelpers: false });

  const cycle = tryCycleGroups(poolGraph, poolUserIdsFull);
  if (cycle) {
    // IF cycle found → DONE
    const { doubtIds: memberDoubtIds, subjects: cycleSubjects } =
      resolveCycleMemberDoubts(cycle, sortedPool, poolStrongByUser);
    const subjects = [...new Set(cycleSubjects)];

    const cycleGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.matchGroup.create({
        data: {
          type: "cycle",
          subjects,
          members: {
            create: cycle.map((userId, i) => ({
              userId,
              doubtId: memberDoubtIds[i]!,
              role: "helper",
            })),
          },
        },
      });

      await tx.waitingPool.deleteMany({
        where: { userId: { in: cycle } },
      });

      return group;
    });

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
  const { graph: extendedGraph } = await buildGraph(sortedPool, {
    includeExternalHelpers: true,
  });

  const oneWay = tryOneWayGroup(extendedGraph, poolUserIdsFull);
  if (!oneWay) return;

  const expiresAt = new Date(Date.now() + PROPOSAL_EXPIRY_MINUTES * 60 * 1000);
  const { helperId, learnerIds } = oneWay;
  const allMembers = [helperId, ...learnerIds];
  const doubtIds = learnerIds.map((id) => userToPoolEntry.get(id)!.doubtId);
  const subjects = [
    ...new Set(learnerIds.map((id) => userToPoolEntry.get(id)!.subject)),
  ];

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
