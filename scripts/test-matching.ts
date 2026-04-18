/**
 * Test script for the matching algorithm.
 *
 * Run: npx tsx scripts/test-matching.ts
 *
 * What it does:
 * 1. Creates 2 test users (Alice & Bob) with academic profiles
 * 2. Alice is strong in "thermodynamics", Bob is strong in "data structures"
 * 3. Alice posts a doubt about "data structures" → enters waiting pool
 * 4. Bob posts a doubt about "thermodynamics" → enters waiting pool
 * 5. Engine detects cycle: Alice helps Bob (thermo), Bob helps Alice (DS)
 * 6. Verifies the match group was created
 */

import { PrismaClient } from "../src/generated/prisma";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function cleanup() {
  console.log("\n🧹 Cleaning up test data...");
  const testEmails = ["alice.test@srmap.edu.in", "bob.test@srmap.edu.in"];

  for (const email of testEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.waitingPool.deleteMany({ where: { userId: user.id } });
      await prisma.matchGroupMember.deleteMany({ where: { userId: user.id } });
      await prisma.subjectAffinity.deleteMany({
        where: { academicProfile: { userId: user.id } },
      });
      await prisma.academicProfile.deleteMany({ where: { userId: user.id } });
      await prisma.doubt.deleteMany({ where: { seekerId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }

  // Clean empty match groups
  await prisma.matchGroup.deleteMany({
    where: { members: { none: {} } },
  });

  await prisma.matchProposal.deleteMany({
    where: { status: { in: ["PENDING", "EXPIRED"] } },
  });

  console.log("   Done.\n");
}

async function createTestUser(
  name: string,
  email: string,
  rollNumber: string,
  strongSubjects: string[]
) {
  const passwordHash = await hash("Test1234", 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      emailVerified: new Date(),
      profileComplete: true,
    },
  });

  const category = await prisma.category.findFirst({ where: { isActive: true } });

  await prisma.academicProfile.create({
    data: {
      userId: user.id,
      rollNumber,
      department: "CSE",
      year: 2,
      semester: 3,
      subjectAffinities: {
        create: strongSubjects.map((s) => ({ subject: s.toLowerCase() })),
      },
    },
  });

  console.log(`   ✅ ${name} (${email})`);
  console.log(`      Strong subjects: ${strongSubjects.join(", ")}`);

  return { user, categoryId: category!.id };
}

async function postDoubt(
  userId: string,
  categoryId: string,
  title: string,
  subject: string
) {
  const doubt = await prisma.doubt.create({
    data: {
      title,
      subject: subject.toLowerCase(),
      description: `Test doubt about ${subject}. `.repeat(3) + "Need help understanding core concepts.",
      categoryId,
      seekerId: userId,
      urgency: "MEDIUM",
    },
  });

  // Add to waiting pool
  await prisma.waitingPool.create({
    data: {
      userId,
      doubtId: doubt.id,
      subject: doubt.subject,
    },
  });

  console.log(`   📝 Doubt posted: "${title}" (subject: ${subject})`);
  return doubt;
}

async function showPool() {
  const pool = await prisma.waitingPool.findMany({
    include: {
      user: { select: { name: true } },
      doubt: { select: { subject: true } },
    },
  });

  if (pool.length === 0) {
    console.log("   Pool is empty (all matched!)");
  } else {
    console.log(`   Pool has ${pool.length} entries:`);
    for (const entry of pool) {
      console.log(`     - ${entry.user.name} needs help with: ${entry.doubt.subject}`);
    }
  }
}

async function showGroups() {
  const groups = await prisma.matchGroup.findMany({
    include: {
      members: {
        include: {
          matchGroup: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (groups.length === 0) {
    console.log("   No match groups found.");
  } else {
    for (const group of groups) {
      const memberIds = group.members.map((m) => m.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.name]));

      console.log(`   🎉 Group (${group.type}) — subjects: ${group.subjects.join(", ")}`);
      for (const member of group.members) {
        console.log(`     - ${userMap.get(member.userId)} (${member.role})`);
      }
    }
  }
}

async function showProposals() {
  const proposals = await prisma.matchProposal.findMany({
    where: { status: "PENDING" },
  });

  if (proposals.length === 0) {
    console.log("   No pending proposals.");
  } else {
    for (const p of proposals) {
      const users = await prisma.user.findMany({
        where: { id: { in: p.members } },
        select: { id: true, name: true },
      });
      const helper = users.find((u) => u.id === p.helperId);
      const learners = users.filter((u) => u.id !== p.helperId);
      console.log(`   📋 Proposal (${p.type}): ${helper?.name} → helps ${learners.map((l) => l.name).join(", ")}`);
      console.log(`      Subjects: ${p.subjects.join(", ")}`);
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  PEER MATCHING ALGORITHM TEST");
  console.log("═══════════════════════════════════════════\n");

  await cleanup();

  // ── Test 1: Cycle Matching ─────────────────────────

  console.log("━━━ Test 1: Cycle Matching (A ↔ B) ━━━\n");

  console.log("Step 1: Creating test users...");
  const { user: alice, categoryId } = await createTestUser(
    "Alice Test",
    "alice.test@srmap.edu.in",
    "TEST001",
    ["thermodynamics", "physics"]
  );
  const { user: bob } = await createTestUser(
    "Bob Test",
    "bob.test@srmap.edu.in",
    "TEST002",
    ["data structures", "algorithms"]
  );

  console.log("\nStep 2: Alice posts a doubt about 'Data Structures'...");
  await postDoubt(alice.id, categoryId, "Help with binary trees", "data structures");

  console.log("\nStep 3: Checking waiting pool...");
  await showPool();

  console.log("\nStep 4: Bob posts a doubt about 'Thermodynamics'...");
  await postDoubt(bob.id, categoryId, "Help with heat transfer", "thermodynamics");

  console.log("\nStep 5: Checking waiting pool (before matching)...");
  await showPool();

  console.log("\nStep 6: Running matching engine...");
  const { triggerMatching } = await import("../src/lib/matching/engine");
  await triggerMatching({ skipPoolMinWait: true });

  console.log("\nStep 7: Checking waiting pool (after matching)...");
  await showPool();

  console.log("\nStep 8: Checking match groups...");
  await showGroups();

  console.log("\nStep 9: Checking pending proposals...");
  await showProposals();

  // ── Summary ────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════");
  console.log("  TEST COMPLETE");
  console.log("═══════════════════════════════════════════\n");

  await cleanup();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌ Test failed:", e);
  await cleanup().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
