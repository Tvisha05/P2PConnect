import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeOwnDoubtFromWaitingPool, triggerMatching } from "@/lib/matching/engine";
import { POOL_MIN_WAIT_BEFORE_MATCH_MS } from "@/lib/matching/constants";

let lastAutoTriggerAt = 0;
const AUTO_TRIGGER_COOLDOWN_MS = 10_000;

// GET /api/matching/pool — view current waiting pool (for debugging/admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Opportunistically run matching once rows are old enough.
    // The client polls this endpoint every few seconds, so this ensures one-way
    // fallback still runs even if delayed background timers don't execute.
    const nowMs = Date.now();
    if (nowMs - lastAutoTriggerAt >= AUTO_TRIGGER_COOLDOWN_MS) {
      const cutoff = new Date(nowMs - POOL_MIN_WAIT_BEFORE_MATCH_MS);
      const hasMatureRows = await prisma.waitingPool.findFirst({
        where: { joinedAt: { lte: cutoff } },
        select: { id: true },
      });
      if (hasMatureRows) {
        lastAutoTriggerAt = nowMs;
        await triggerMatching();
      }
    }

    // adds user id, name, image, doubt id, title, subject, urgency into the pool
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

// DELETE /api/matching/pool?doubtId=<id> — remove current user's own doubt from pool
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doubtId = req.nextUrl.searchParams.get("doubtId");
    if (!doubtId) {
      return NextResponse.json({ error: "doubtId is required" }, { status: 400 });
    }

    const removed = await removeOwnDoubtFromWaitingPool(session.user.id, doubtId);
    return NextResponse.json({ removed });
  } catch (error) {
    console.error("Pool remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove from pool" },
      { status: 500 }
    );
  }
}
