import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { suggestTagSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { Prisma, TagStatus } from "@/generated/prisma";

// ─── GET /api/tags — list tags with optional status + search filters ────

export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search");

  const where: Prisma.TagWhereInput = {};

  if (statusParam && ["APPROVED", "SUGGESTED", "REJECTED"].includes(statusParam)) {
    where.status = statusParam as Prisma.EnumTagStatusFilter;
  } else {
    // Default to approved tags for public listing
    where.status = "APPROVED";
  }

  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      voteCount: true,
      _count: { select: { doubtTags: true } },
    },
  });

  return NextResponse.json({ tags });
}

// ─── POST /api/tags — suggest a new tag ─────────────────────────────────

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

  const result = suggestTagSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid tag name" },
      { status: 400 }
    );
  }

  const name = result.data.name.trim().replace(/\s+/g, " ");
  const slug = slugify(name);

  if (!slug) {
    return NextResponse.json({ error: "Invalid tag name" }, { status: 400 });
  }

  const existingTag = await prisma.tag.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (existingTag) {
    return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
  }

  const tag = await prisma.$transaction(async (tx) => {
    const createdTag = await tx.tag.create({
      data: {
        name,
        slug,
        status: TagStatus.SUGGESTED,
        suggestedById: session.user.id,
        voteCount: 1,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        voteCount: true,
        suggestedById: true,
        createdAt: true,
      },
    });

    await tx.tagVote.create({
      data: {
        tagId: createdTag.id,
        userId: session.user.id,
      },
    });

    return createdTag;
  });

  return NextResponse.json({ tag }, { status: 201 });
}
