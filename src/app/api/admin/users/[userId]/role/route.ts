import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserRoleSchema } from "@/lib/validators";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
  }

  const { userId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateUserRoleSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: result.data.role },
    select: { id: true, role: true },
  });

  return NextResponse.json({ user });
}
