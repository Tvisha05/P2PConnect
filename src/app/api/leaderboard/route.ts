import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LeaderboardPeriod } from "@/types";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams;
  const period = (url.get("period") ?? "all_time") as LeaderboardPeriod;
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.get("limit") ?? "20")));

  const validPeriods: LeaderboardPeriod[] = ["all_time", "monthly", "weekly"];
  if (!validPeriods.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  if (period === "all_time") {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { isBanned: false },
        orderBy: { karma: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, image: true, karma: true,
          academicProfile: { select: { department: true } },
        },
      }),
      prisma.user.count({ where: { isBanned: false } }),
    ]);

    const entries = users.map((u, i) => ({
      userId: u.id, name: u.name, image: u.image, karma: u.karma,
      department: u.academicProfile?.department ?? null,
      rank: (page - 1) * limit + i + 1,
    }));

    return NextResponse.json({ entries, total, page, totalPages: Math.ceil(total / limit) });
  }

  const now = new Date();
  const periodStart = period === "weekly"
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const grouped = await prisma.karmaEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: periodStart } },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.karmaEvent
    .groupBy({ by: ["userId"], where: { createdAt: { gte: periodStart } } })
    .then((r) => r.length);

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isBanned: false },
    select: {
      id: true, name: true, image: true, karma: true,
      academicProfile: { select: { department: true } },
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const entries = grouped
    .filter((g) => userMap.has(g.userId))
    .map((g, i) => {
      const u = userMap.get(g.userId)!;
      return {
        userId: u.id, name: u.name, image: u.image,
        karma: g._sum.delta ?? 0,
        department: u.academicProfile?.department ?? null,
        rank: (page - 1) * limit + i + 1,
      };
    });

  return NextResponse.json({ entries, total, page, totalPages: Math.ceil(total / limit) });
}
