import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { banUserSchema } from "@/lib/validators";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  if (userId === session.user.id) return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = banUserSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: true, bannedAt: new Date(), banReason: result.data.reason },
    select: { id: true, isBanned: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: false, bannedAt: null, banReason: null },
    select: { id: true, isBanned: true },
  });

  return NextResponse.json({ user });
}
