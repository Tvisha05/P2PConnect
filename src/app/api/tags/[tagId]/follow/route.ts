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
    select: { id: true },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const existingFollow = await prisma.userTag.findFirst({
    where: {
      userId: session.user.id,
      tagId,
    },
    select: { id: true },
  });

  if (existingFollow) {
    await prisma.userTag.delete({
      where: { id: existingFollow.id },
    });

    return NextResponse.json({ following: false });
  }

  await prisma.userTag.create({
    data: {
      userId: session.user.id,
      tagId,
    },
  });

  return NextResponse.json({ following: true });
}
