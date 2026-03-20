import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

// ─── GET /api/tags — list tags with optional status + search filters ────

export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search");

  const where: Prisma.TagWhereInput = {};

  if (statusParam && ["APPROVED", "SUGGESTED", "REJECTED"].includes(statusParam)) {
    where.status = statusParam as Prisma.EnumTagStatusFilter;
  } else {
    // Default to approved tags for public listing
    where.status = "APPROVED";
  }

  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      voteCount: true,
      _count: { select: { doubtTags: true } },
    },
  });

  return NextResponse.json({ tags });
}
