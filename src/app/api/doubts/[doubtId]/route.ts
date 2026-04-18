import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateDoubtSchema } from "@/lib/validators";

type Params = { params: Promise<{ doubtId: string }> };

const doubtInclude = {
  seeker: { select: { id: true, name: true, image: true, karma: true } },
  helper: { select: { id: true, name: true, image: true, karma: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  attachments: true,
  _count: { select: { messages: true, bookmarks: true } },
};

// ─── GET /api/doubts/[doubtId] — doubt detail ──────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { doubtId } = await params;

  const doubt = await prisma.doubt.findUnique({
    where: { id: doubtId },
    include: doubtInclude,
  });

  if (!doubt) {
    return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
  }

  // Increment view count (fire and forget)
  prisma.doubt
    .update({ where: { id: doubtId }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return NextResponse.json({ doubt });
}

// ─── PATCH /api/doubts/[doubtId] — edit doubt (before replies only) ────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { doubtId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateDoubtSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const doubt = await prisma.doubt.findUnique({
    where: { id: doubtId },
    include: { _count: { select: { messages: true } } },
  });

  if (!doubt) {
    return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
  }
  if (doubt.seekerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (doubt._count.messages > 0) {
    return NextResponse.json(
      { error: "Cannot edit after replies" },
      { status: 403 }
    );
  }

  const { tagIds, categoryId, ...updateFields } = result.data;

  // Verify category if being updated
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || !cat.isActive) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  // Verify tags if being updated
  if (tagIds && tagIds.length > 0) {
    const validTags = await prisma.tag.findMany({
      where: { id: { in: tagIds }, status: "APPROVED" },
      select: { id: true },
    });
    if (validTags.length !== tagIds.length) {
      return NextResponse.json({ error: "One or more tags are invalid" }, { status: 400 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (tagIds) {
      await tx.doubtTag.deleteMany({ where: { doubtId } });
      if (tagIds.length > 0) {
        await tx.doubtTag.createMany({
          data: tagIds.map((tagId) => ({ doubtId, tagId })),
        });
      }
    }

    return tx.doubt.update({
      where: { id: doubtId },
      data: {
        ...updateFields,
        ...(categoryId ? { categoryId } : {}),
        isEdited: true,
      },
      include: doubtInclude,
    });
  });

  return NextResponse.json({ doubt: updated });
}

// ─── DELETE /api/doubts/[doubtId] — delete doubt (before replies only) ──

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { doubtId } = await params;

  const doubt = await prisma.doubt.findUnique({
    where: { id: doubtId },
    include: { _count: { select: { messages: true } } },
  });

  if (!doubt) {
    return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
  }
  if (doubt.seekerId !== session.user.id && session.user.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (doubt._count.messages > 0 && session.user.role === "USER") {
    return NextResponse.json(
      { error: "Cannot delete after replies" },
      { status: 403 }
    );
  }

  await prisma.doubt.delete({ where: { id: doubtId } });

  return NextResponse.json({ message: "Doubt deleted" });
}
