import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAnnouncementSchema } from "@/lib/validators";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = 20;

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.announcement.count(),
  ]);

  return NextResponse.json({ announcements, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createAnnouncementSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: { ...result.data, authorId: session.user.id },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
