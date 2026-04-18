import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const members = await prisma.matchGroupMember.findMany({
      where: { matchGroupId: groupId },
      select: { userId: true },
    });

    const users = await prisma.user.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: { id: true, name: true, publicKey: true },
    });

    return NextResponse.json({
      members: users.map((u) => ({
        userId: u.id,
        name: u.name,
        publicKey: u.publicKey,
      })),
    });
  } catch (error) {
    console.error("Get member keys error:", error);
    return NextResponse.json({ error: "Failed to fetch member keys" }, { status: 500 });
  }
}
