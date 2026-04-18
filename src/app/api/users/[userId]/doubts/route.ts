import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const doubtInclude = {
  seeker: { select: { id: true, name: true, image: true } },
  helper: { select: { id: true, name: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  attachments: true,
  _count: { select: { messages: true, bookmarks: true } },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!/^[a-f\d]{24}$/i.test(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = req.nextUrl.searchParams;
  const type = url.get("type") === "helped" ? "helped" : "posted";
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = Math.min(20, Math.max(1, parseInt(url.get("limit") ?? "10")));

  const where = type === "posted" ? { seekerId: userId } : { helperId: userId };

  const [doubts, total] = await Promise.all([
    prisma.doubt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: doubtInclude,
    }),
    prisma.doubt.count({ where }),
  ]);

  return NextResponse.json({ doubts, total, page, totalPages: Math.ceil(total / limit) });
}
