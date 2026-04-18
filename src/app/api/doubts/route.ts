import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDoubtSchema } from "@/lib/validators";
import { Prisma } from "@/generated/prisma";
import { triggerMatching } from "@/lib/matching/engine";
import { POOL_MIN_WAIT_BEFORE_MATCH_MS } from "@/lib/matching/constants";
import { notifyHelpersOfNewDoubt } from "@/lib/notifications";

const doubtInclude = {
  seeker: { select: { id: true, name: true, image: true } },
  helper: { select: { id: true, name: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  attachments: true,
  _count: { select: { messages: true, bookmarks: true } },
};

// ─── GET /api/doubts — list with filters, sorting, pagination, search ───

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams;

  const status = url.get("status") as string | null;
  const categoryId = url.get("categoryId");
  const tagsParam = url.get("tags"); // comma-separated slugs
  const urgency = url.get("urgency") as string | null;
  const search = url.get("search");
  const sort = url.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.get("limit") ?? "20")));

  const where: Prisma.DoubtWhereInput = {};

  if (status && ["OPEN", "CLAIMED", "IN_PROGRESS", "RESOLVED"].includes(status)) {
    where.status = status as Prisma.EnumDoubtStatusFilter;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (tagsParam) {
    const tagSlugs = tagsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (tagSlugs.length > 0) {
      where.tags = { some: { tag: { slug: { in: tagSlugs } } } };
    }
  }
  if (urgency && ["LOW", "MEDIUM", "HIGH"].includes(urgency)) {
    where.urgency = urgency as Prisma.EnumUrgencyFilter;
  }

  // Text search via case-insensitive contains
  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Sorting
  let orderBy: Prisma.DoubtOrderByWithRelationInput;
  switch (sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "upvotes":
      orderBy = { upvoteCount: "desc" };
      break;
    case "urgency":
      orderBy = { urgency: "desc" };
      break;
    case "unanswered":
      if (!status) where.status = "OPEN";
      orderBy = { createdAt: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const [doubts, total] = await Promise.all([
    prisma.doubt.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: doubtInclude,
    }),
    prisma.doubt.count({ where }),
  ]);

  return NextResponse.json({
    doubts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// ─── POST /api/doubts — create doubt ────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createDoubtSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const {
    title,
    subject,
    description,
    categoryId,
    tagIds,
    urgency,
    attachmentUrls,
  } = result.data;

  const resolvedDescription =
    description?.trim() && description.trim().length > 0
      ? description.trim()
      : `Need help understanding ${subject}. ` +
        "Need help understanding ".repeat(2) +
        "Please explain the key concepts and share a worked example.";

  // Verify category exists
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Verify tags exist and are approved
  if (tagIds && tagIds.length > 0) {
    const validTags = await prisma.tag.findMany({
      where: { id: { in: tagIds }, status: "APPROVED" },
      select: { id: true },
    });
    if (validTags.length !== tagIds.length) {
      return NextResponse.json(
        { error: "One or more tags are invalid" },
        { status: 400 }
      );
    }
  }

  const doubt = await prisma.doubt.create({
    data: {
      title,
      subject: subject.toLowerCase().trim(),
      description: resolvedDescription,
      categoryId,
      seekerId: session.user.id,
      urgency: urgency ?? "MEDIUM",
      tags: tagIds
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
      attachments: attachmentUrls
        ? { create: attachmentUrls }
        : undefined,
    },
    include: doubtInclude,
  });

  // Notify helpers whose strong subjects match this doubt's subject.
  void notifyHelpersOfNewDoubt({
    doubtId: doubt.id,
    subject: doubt.subject,
    title: doubt.title,
    seekerId: session.user.id,
  }).catch((err) => console.error("Helper new-doubt notification error:", err));

  // Auto-add to waiting pool + run matching (await first pass so DB + notifications finish
  // before the response; delayed pass catches the 30s pool window).
  try {
    await prisma.waitingPool.create({
      data: {
        userId: session.user.id,
        doubtId: doubt.id,
        subject: doubt.subject,
      },
    });

    // First pass at +30s attempts cycle matching.
    // Second pass at +32s guarantees one-way matching is attempted
    // (the first pass may hit the cycle-only window boundary and return early).
    after(async () => {
      try {
        await new Promise((r) => setTimeout(r, POOL_MIN_WAIT_BEFORE_MATCH_MS));
        await triggerMatching();
        await new Promise((r) => setTimeout(r, 2000));
        await triggerMatching();
      } catch (err) {
        console.error("Delayed matching (after) error:", err);
      }
    });
  } catch (err) {
    console.error("Failed to add to waiting pool:", err);
  }

  return NextResponse.json({ doubt }, { status: 201 });
}
