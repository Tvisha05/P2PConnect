import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/tags/search?q=... — autocomplete tag search ──────────────

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ tags: [] });
  }

  const tags = await prisma.tag.findMany({
    where: {
      status: "APPROVED",
      name: { contains: query.trim(), mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: 10,
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return NextResponse.json({ tags });
}
