import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { pushGroupMessage } from "@/lib/realtime";

const sendMessageSchema = z.object({
  ciphertext: z.string().min(1, "Message cannot be empty"),
  nonce: z.string().min(1, "Nonce is required"),
});

export async function GET(
  req: NextRequest,
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

    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = 50;

    const messages = await prisma.groupMessage.findMany({
      where: { matchGroupId: groupId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return NextResponse.json({
      messages: messages.reverse(),
      hasMore,
      nextCursor: hasMore ? messages[0]?.id : null,
    });
  } catch (error) {
    console.error("Group messages fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
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

    const body = await req.json();
    const validated = sendMessageSchema.parse(body);

    const message = await prisma.groupMessage.create({
      data: {
        matchGroupId: groupId,
        senderId: session.user.id,
        content: validated.ciphertext,
        nonce: validated.nonce,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    await pushGroupMessage(groupId, {
      id: message.id,
      senderId: message.senderId,
      ciphertext: message.content,
      nonce: message.nonce,
      createdAt: message.createdAt.toISOString(),
    }).catch((err) => {
      console.error("RTDB push failed (message still persisted):", err);
    });

    const members = await prisma.matchGroupMember.findMany({
      where: { matchGroupId: groupId, userId: { not: session.user.id } },
      select: { userId: true },
    });

    if (members.length > 0) {
      const group = await prisma.matchGroup.findUnique({
        where: { id: groupId },
        select: { subjects: true },
      });

      await prisma.notification.createMany({
        data: members.map((m) => ({
          recipientId: m.userId,
          senderId: session.user.id,
          type: "NEW_MESSAGE" as const,
          title: "New message",
          body: `New message in ${group?.subjects.join(", ") ?? "group"}`,
          linkUrl: `/groups/${groupId}`,
        })),
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: (error as { issues: { message: string }[] }).issues[0].message },
        { status: 400 }
      );
    }
    console.error("Group message send error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
