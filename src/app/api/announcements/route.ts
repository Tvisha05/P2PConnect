import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = Math.min(20, Math.max(1, parseInt(url.get("limit") ?? "10")));

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.announcement.count(),
  ]);

  return NextResponse.json({
    announcements,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
