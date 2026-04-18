import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = req.nextUrl.searchParams;
  const search = url.get("search");
  const roleFilter = url.get("role");
  const bannedFilter = url.get("banned");
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) where.OR = [
    { name: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
  ];
  if (roleFilter && ["USER","MODERATOR","ADMIN"].includes(roleFilter)) where.role = roleFilter;
  if (bannedFilter === "true") where.isBanned = true;
  if (bannedFilter === "false") where.isBanned = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      select: {
        id: true, name: true, email: true, image: true, role: true,
        karma: true, isBanned: true, bannedAt: true, banReason: true, createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}
