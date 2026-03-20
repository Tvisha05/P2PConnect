import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/matching/proposals — get pending proposals for the current user (as helper)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expire old proposals
    await prisma.matchProposal.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    const proposals = await prisma.matchProposal.findMany({
      where: {
        helperId: session.user.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrich with user names for display
    const allUserIds = [...new Set(proposals.flatMap((p) => p.members))];
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true, image: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = proposals.map((p) => ({
      ...p,
      memberDetails: p.members.map((id) => ({
        id,
        ...userMap.get(id),
        isHelper: id === p.helperId,
      })),
    }));

    return NextResponse.json({ proposals: enriched });
  } catch (error) {
    console.error("Proposals fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}
