import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const { announcementId } = await params;

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ announcement });
}
