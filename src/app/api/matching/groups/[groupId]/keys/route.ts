import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const storeKeysSchema = z.object({
  keys: z.array(
    z.object({
      userId: z.string().min(1),
      encryptedKey: z.string().min(1),
    })
  ),
});

// GET — fetch my encrypted group key
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

    const keyRecord = await prisma.groupEncryptedKey.findUnique({
      where: {
        matchGroupId_userId: { matchGroupId: groupId, userId: session.user.id },
      },
    });

    // Also return whether ANY keys exist (so client knows if a group key has been generated)
    const anyExist = keyRecord
      ? true
      : !!(await prisma.groupEncryptedKey.findFirst({
          where: { matchGroupId: groupId },
          select: { id: true },
        }));

    return NextResponse.json({
      encryptedKey: keyRecord?.encryptedKey ?? null,
      groupHasKeys: anyExist,
    });
  } catch (error) {
    console.error("Get group key error:", error);
    return NextResponse.json({ error: "Failed to fetch group key" }, { status: 500 });
  }
}

// DELETE — remove my own stale sealed key (so another member can re-seal for me)
export async function DELETE(
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

    await prisma.groupEncryptedKey.deleteMany({
      where: { matchGroupId: groupId, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete group key error:", error);
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}

// POST — distribute group keys (first distributor wins; also used to add keys for new members)
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
    const { keys } = storeKeysSchema.parse(body);

    // Verify all targets are members
    const members = await prisma.matchGroupMember.findMany({
      where: { matchGroupId: groupId },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    for (const k of keys) {
      if (!memberIds.has(k.userId)) {
        return NextResponse.json({ error: `User ${k.userId} is not a member` }, { status: 400 });
      }
    }

    // First distributor wins — upsert with empty update preserves the original key.
    for (const k of keys) {
      await prisma.groupEncryptedKey.upsert({
        where: { matchGroupId_userId: { matchGroupId: groupId, userId: k.userId } },
        create: { matchGroupId: groupId, userId: k.userId, encryptedKey: k.encryptedKey },
        update: {},
      });
    }

    return NextResponse.json({ created: keys.length }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: (error as { issues: { message: string }[] }).issues[0].message },
        { status: 400 }
      );
    }
    console.error("Store group keys error:", error);
    return NextResponse.json({ error: "Failed to store group keys" }, { status: 500 });
  }
}
