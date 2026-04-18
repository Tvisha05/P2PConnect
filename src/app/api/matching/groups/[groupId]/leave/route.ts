import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;
    if (!/^[a-f\d]{24}$/i.test(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const membership = await prisma.matchGroupMember.findUnique({
      where: {
        matchGroupId_userId: { matchGroupId: groupId, userId: session.user.id },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    await prisma.matchGroupMember.delete({
      where: { id: membership.id },
    });

    await prisma.groupEncryptedKey.deleteMany({
      where: { matchGroupId: groupId, userId: session.user.id },
    });

    await prisma.groupMessageRead.deleteMany({
      where: { userId: session.user.id, message: { matchGroupId: groupId } },
    });

    const remaining = await prisma.matchGroupMember.count({
      where: { matchGroupId: groupId },
    });

    let groupDeleted = false;
    if (remaining === 0) {
      await prisma.matchGroup.delete({ where: { id: groupId } });
      groupDeleted = true;
    }

    return NextResponse.json({ left: true, groupDeleted });
  } catch (error) {
    console.error("Leave group error:", error);
    return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
  }
}
