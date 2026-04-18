import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [karmaEvents, doubtsPosted, doubtsHelped] = await Promise.all([
    prisma.karmaEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, delta: true, reason: true, createdAt: true },
    }),
    prisma.doubt.findMany({
      where: { seekerId: userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.doubt.findMany({
      where: { helperId: userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
  ]);

  type ActivityEvent =
    | { type: "karma"; id: string; delta: number; reason: string; createdAt: string }
    | { type: "posted"; id: string; doubtId: string; title: string; status: string; createdAt: string }
    | { type: "helped"; id: string; doubtId: string; title: string; status: string; createdAt: string };

  const events: ActivityEvent[] = [
    ...karmaEvents.map((e) => ({
      type: "karma" as const,
      id: e.id,
      delta: e.delta,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
    })),
    ...doubtsPosted.map((d) => ({
      type: "posted" as const,
      id: `posted-${d.id}`,
      doubtId: d.id,
      title: d.title,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    })),
    ...doubtsHelped.map((d) => ({
      type: "helped" as const,
      id: `helped-${d.id}`,
      doubtId: d.id,
      title: d.title,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    })),
  ];

  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ events });
}
