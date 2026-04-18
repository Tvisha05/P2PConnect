import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tagId } = await params;

  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { id: true, status: true },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  if (tag.status !== "SUGGESTED") {
    return NextResponse.json(
      { error: "Only suggested tags can be voted on" },
      { status: 400 }
    );
  }

  try {
    const updatedTag = await prisma.$transaction(async (tx) => {
      await tx.tagVote.create({
        data: {
          tagId,
          userId: session.user.id,
        },
      });

      return tx.tag.update({
        where: { id: tagId },
        data: { voteCount: { increment: 1 } },
        select: { voteCount: true },
      });
    });

    return NextResponse.json({ voteCount: updatedTag.voteCount });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      const existing = await prisma.tag.findUnique({
        where: { id: tagId },
        select: { voteCount: true },
      });

      return NextResponse.json(
        {
          error: "You have already voted for this tag",
          voteCount: existing?.voteCount ?? 0,
        },
        { status: 409 }
      );
    }

    throw error;
  }
}
