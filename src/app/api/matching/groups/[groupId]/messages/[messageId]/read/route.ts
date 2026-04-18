import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, messageId } = await params;
    if (!/^[a-f\d]{24}$/i.test(groupId) || !/^[a-f\d]{24}$/i.test(messageId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const membership = await prisma.matchGroupMember.findUnique({
      where: {
        matchGroupId_userId: { matchGroupId: groupId, userId: session.user.id },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const message = await prisma.groupMessage.findFirst({
      where: { id: messageId, matchGroupId: groupId },
    });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await prisma.groupMessageRead.upsert({
      where: {
        messageId_userId: { messageId, userId: session.user.id },
      },
      create: { messageId, userId: session.user.id },
      update: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
