import "dotenv/config";
import { PrismaClient, UserRole, TagStatus } from "../src/generated/prisma";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── System Config ──────────────────────────────────────
  const configs = [
    // Karma weights
    { key: "karma.doubt_resolved_seeker", value: "5" },
    { key: "karma.doubt_resolved_helper", value: "15" },
    { key: "karma.doubt_upvoted", value: "2" },
    { key: "karma.doubt_downvoted", value: "-1" },
    { key: "karma.message_upvoted", value: "1" },
    { key: "karma.message_downvoted", value: "-1" },
    { key: "karma.helper_dismissed", value: "-5" },
    { key: "karma.abandon_approved", value: "-3" },
    { key: "karma.tag_approved", value: "3" },

    // Rate limits (per hour)
    { key: "ratelimit.doubts_per_hour", value: "5" },
    { key: "ratelimit.messages_per_minute", value: "30" },
    { key: "ratelimit.reports_per_hour", value: "3" },
    { key: "ratelimit.votes_per_minute", value: "20" },

    // Auto-resolve
    { key: "auto_resolve.enabled", value: "true" },
    { key: "auto_resolve.days_inactive", value: "7" },

    // Upload limits
    { key: "upload.max_file_size_mb", value: "10" },
    { key: "upload.max_files_per_doubt", value: "5" },
    { key: "upload.max_files_per_message", value: "3" },
    { key: "upload.allowed_types", value: "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain" },

    // Tag voting
    { key: "tags.votes_to_approve", value: "5" },
    { key: "tags.max_per_doubt", value: "5" },

    // General
    { key: "doubts.max_claim_hours", value: "48" },
    { key: "site.name", value: "Peer Connect" },
    { key: "site.description", value: "Peer-to-peer academic doubt resolution" },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log(`✅ ${configs.length} system configs seeded`);

  // ─── Categories ─────────────────────────────────────────
  const categories = [
    { name: "Mathematics", slug: "mathematics", description: "Algebra, calculus, statistics, discrete math, and more", sortOrder: 1 },
    { name: "Physics", slug: "physics", description: "Classical mechanics, thermodynamics, electromagnetism, optics", sortOrder: 2 },
    { name: "Chemistry", slug: "chemistry", description: "Organic, inorganic, physical, and analytical chemistry", sortOrder: 3 },
    { name: "Computer Science", slug: "computer-science", description: "Data structures, algorithms, OS, DBMS, networking", sortOrder: 4 },
    { name: "Programming", slug: "programming", description: "C, C++, Java, Python, JavaScript, and other languages", sortOrder: 5 },
    { name: "Web Development", slug: "web-development", description: "HTML, CSS, JS frameworks, backend, databases", sortOrder: 6 },
    { name: "Electronics", slug: "electronics", description: "Digital electronics, signals, embedded systems", sortOrder: 7 },
    { name: "Electrical Engineering", slug: "electrical-engineering", description: "Circuits, power systems, control systems", sortOrder: 8 },
    { name: "Mechanical Engineering", slug: "mechanical-engineering", description: "Thermodynamics, fluid mechanics, machine design", sortOrder: 9 },
    { name: "Civil Engineering", slug: "civil-engineering", description: "Structural analysis, surveying, construction", sortOrder: 10 },
    { name: "Biology", slug: "biology", description: "Cell biology, genetics, microbiology, ecology", sortOrder: 11 },
    { name: "English", slug: "english", description: "Grammar, literature, writing, communication skills", sortOrder: 12 },
    { name: "Economics", slug: "economics", description: "Micro/macroeconomics, econometrics, finance", sortOrder: 13 },
    { name: "Management", slug: "management", description: "Marketing, HR, operations, business strategy", sortOrder: 14 },
    { name: "Other", slug: "other", description: "Subjects not covered by other categories", sortOrder: 99 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      create: { ...cat, isActive: true },
    });
  }
  console.log(`✅ ${categories.length} categories seeded`);

  // ─── Default Tags ───────────────────────────────────────
  const tags = [
    "calculus", "linear-algebra", "probability", "statistics",
    "data-structures", "algorithms", "machine-learning", "python",
    "javascript", "java", "c-plus-plus", "react", "nextjs",
    "sql", "operating-systems", "computer-networks",
    "digital-logic", "thermodynamics", "mechanics",
    "organic-chemistry", "homework", "exam-prep", "project-help",
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag },
      update: {},
      create: {
        name: tag.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        slug: tag,
        status: TagStatus.APPROVED,
      },
    });
  }
  console.log(`✅ ${tags.length} tags seeded`);

  // ─── Admin User ─────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@peerconnect.dev";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN },
    create: {
      name: "Admin",
      email: adminEmail,
      emailVerified: new Date(),
      passwordHash: hashSync(adminPassword, 12),
      role: UserRole.ADMIN,
      karma: 0,
    },
  });

  // Create email preferences for admin
  await prisma.emailPreference.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  console.log(`✅ Admin user seeded (${adminEmail})`);
  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
