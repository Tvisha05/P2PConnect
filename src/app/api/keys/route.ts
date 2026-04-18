import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerKeySchema = z.object({
  publicKey: z.string().min(1).max(200),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { publicKey: true },
    });

    return NextResponse.json({ publicKey: user?.publicKey ?? null });
  } catch (error) {
    console.error("Get public key error:", error);
    return NextResponse.json({ error: "Failed to fetch key" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { publicKey } = registerKeySchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { publicKey },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: (error as { issues: { message: string }[] }).issues[0].message },
        { status: 400 }
      );
    }
    console.error("Register key error:", error);
    return NextResponse.json({ error: "Failed to register key" }, { status: 500 });
  }
}
