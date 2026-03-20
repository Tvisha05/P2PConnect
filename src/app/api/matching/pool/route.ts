import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/matching/pool — view current waiting pool (for debugging/admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await prisma.waitingPool.findMany({
      orderBy: { joinedAt: "asc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
        doubt: { select: { id: true, title: true, subject: true, urgency: true } },
      },
    });

    return NextResponse.json({ pool });
  } catch (error) {
    console.error("Pool fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pool" },
      { status: 500 }
    );
  }
}
