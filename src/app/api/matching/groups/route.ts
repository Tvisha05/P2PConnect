import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/matching/groups — get groups the current user is part of
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.matchGroupMember.findMany({
      where: { userId: session.user.id },
      include: {
        matchGroup: {
          include: {
            members: true,
          },
        },
      },
      orderBy: { matchGroup: { createdAt: "desc" } },
    });

    // Enrich with user details
    const allUserIds = [
      ...new Set(
        memberships.flatMap((m) => m.matchGroup.members.map((mm) => mm.userId))
      ),
    ];
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const groups = memberships.map((m) => ({
      id: m.matchGroup.id,
      type: m.matchGroup.type,
      subjects: m.matchGroup.subjects,
      myRole: m.role,
      createdAt: m.matchGroup.createdAt,
      members: m.matchGroup.members.map((mm) => ({
        ...userMap.get(mm.userId),
        role: mm.role,
        doubtId: mm.doubtId,
      })),
    }));

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Groups fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
