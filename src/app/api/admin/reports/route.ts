import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = req.nextUrl.searchParams;
  const status = url.get("status");
  const targetType = url.get("targetType");
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status && ["PENDING","REVIEWED","RESOLVED","DISMISSED"].includes(status)) where.status = status;
  if (targetType && ["DOUBT","MESSAGE","USER"].includes(targetType)) where.targetType = targetType;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      include: {
        reporter: { select: { id: true, name: true, image: true } },
        targetUser: { select: { id: true, name: true } },
        doubt: { select: { id: true, title: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({ reports, total, page, totalPages: Math.ceil(total / limit) });
}
