import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET — list notifications for current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10))
    );

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.notification.count({
        where: { recipientId: session.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl,
        isRead: n.isRead,
        createdAt: n.createdAt,
        sender: n.sender,
      })),
      unreadCount,
    });
  } catch (e) {
    console.error("Notifications GET error:", e);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

// PATCH — mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = patchSchema.parse(body);

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        recipientId: session.user.id,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Notifications PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
