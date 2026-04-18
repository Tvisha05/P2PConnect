import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAnnouncementSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.string().min(10).max(5000).optional(),
});

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { announcementId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateAnnouncementSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: result.data,
  });

  return NextResponse.json({ announcement });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { announcementId } = await params;
  await prisma.announcement.delete({ where: { id: announcementId } });
  return NextResponse.json({ message: "Deleted" });
}
