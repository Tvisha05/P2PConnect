import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!/^[a-f\d]{24}$/i.test(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      karma: true,
      role: true,
      createdAt: true,
      lastActiveAt: true,
      isBanned: true,
      academicProfile: {
        select: {
          department: true,
          year: true,
          semester: true,
          subjectAffinities: { select: { subject: true } },
        },
      },
    },
  });

  if (!user || user.isBanned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [doubtsPosted, doubtsHelped] = await Promise.all([
    prisma.doubt.count({ where: { seekerId: userId } }),
    prisma.doubt.count({ where: { helperId: userId, status: "RESOLVED" } }),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      strongSubjects: user.academicProfile?.subjectAffinities.map((s) => s.subject) ?? [],
      stats: { doubtsPosted, doubtsHelped },
    },
  });
}
