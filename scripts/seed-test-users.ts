/**
 * Creates 2 test users for manual matching testing.
 *
 * Run: npx tsx scripts/seed-test-users.ts
 *
 * After running, you can log in as:
 *   - alice@srmap.edu.in / Test1234
 *   - bob@srmap.edu.in   / Test1234
 *
 * Alice is strong in: thermodynamics, physics
 * Bob is strong in: data structures, algorithms
 *
 * Test flow:
 *   1. Log in as Alice → post a doubt with subject "data structures"
 *   2. Log in as Bob   → post a doubt with subject "thermodynamics"
 *   3. Check /api/matching/pool → should be empty (both matched)
 *   4. Check /api/matching/groups → should show the cycle group
 */

import { PrismaClient } from "../src/generated/prisma";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Test1234", 12);
  const category = await prisma.category.findFirst({ where: { isActive: true } });

  if (!category) {
    console.error("No active category found. Run seed first: npx prisma db seed");
    process.exit(1);
  }

  // ── Alice ──────────────────────────────────────────
  const aliceEmail = "alice@srmap.edu.in";
  let alice = await prisma.user.findUnique({ where: { email: aliceEmail } });

  if (alice) {
    console.log("Alice already exists, skipping...");
  } else {
    alice = await prisma.user.create({
      data: {
        name: "Alice",
        email: aliceEmail,
        passwordHash,
        emailVerified: new Date(),
        profileComplete: true,
      },
    });

    await prisma.academicProfile.create({
      data: {
        userId: alice.id,
        rollNumber: "TESTAA001",
        department: "ME",
        year: 2,
        semester: 3,
        subjectAffinities: {
          create: [
            { subject: "thermodynamics" },
            { subject: "physics" },
          ],
        },
      },
    });

    console.log("✅ Alice created");
    console.log("   Email: alice@srmap.edu.in");
    console.log("   Password: Test1234");
    console.log("   Strong: thermodynamics, physics\n");
  }

  // ── Bob ────────────────────────────────────────────
  const bobEmail = "bob@srmap.edu.in";
  let bob = await prisma.user.findUnique({ where: { email: bobEmail } });

  if (bob) {
    console.log("Bob already exists, skipping...");
  } else {
    bob = await prisma.user.create({
      data: {
        name: "Bob",
        email: bobEmail,
        passwordHash,
        emailVerified: new Date(),
        profileComplete: true,
      },
    });

    await prisma.academicProfile.create({
      data: {
        userId: bob.id,
        rollNumber: "TESTBB002",
        department: "CSE",
        year: 2,
        semester: 3,
        subjectAffinities: {
          create: [
            { subject: "data structures" },
            { subject: "algorithms" },
          ],
        },
      },
    });

    console.log("✅ Bob created");
    console.log("   Email: bob@srmap.edu.in");
    console.log("   Password: Test1234");
    console.log("   Strong: data structures, algorithms\n");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("HOW TO TEST:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("1. Open browser → http://localhost:3000/login");
  console.log('   Log in as Alice: alice@srmap.edu.in / Test1234');
  console.log('   Go to /doubts/new → post a doubt with subject "data structures"');
  console.log("");
  console.log("2. Open incognito/different browser → http://localhost:3000/login");
  console.log('   Log in as Bob: bob@srmap.edu.in / Test1234');
  console.log('   Go to /doubts/new → post a doubt with subject "thermodynamics"');
  console.log("");
  console.log("3. Check results:");
  console.log("   http://localhost:3000/api/matching/pool   → should be empty");
  console.log("   http://localhost:3000/api/matching/groups  → should show cycle group");
  console.log("");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
