import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── GET /api/doubts/similar?title=xxx&description=yyy ──────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const title = req.nextUrl.searchParams.get("title") ?? "";
  const description = req.nextUrl.searchParams.get("description") ?? "";

  const query = `${title} ${description}`.trim();
  if (query.length < 3) {
    return NextResponse.json({ doubts: [] });
  }

  // Split query into words and search for matches in title/description
  const words = query.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length === 0) {
    return NextResponse.json({ doubts: [] });
  }

  const doubts = await prisma.doubt.findMany({
    where: {
      OR: words.flatMap((word) => [
        { title: { contains: word, mode: "insensitive" as const } },
        { description: { contains: word, mode: "insensitive" as const } },
      ]),
    },
    select: { id: true, title: true, status: true, createdAt: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ doubts });
}
