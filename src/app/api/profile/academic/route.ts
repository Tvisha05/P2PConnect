import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { academicProfileSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.academicProfile.findUnique({
      where: { userId: session.user.id },
      include: { subjectAffinities: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Academic profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch academic profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if profile already exists
    const existing = await prisma.academicProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Academic profile already exists. Use PATCH to update." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const validated = academicProfileSchema.parse(body);

    // Check roll number uniqueness
    const rollExists = await prisma.academicProfile.findUnique({
      where: { rollNumber: validated.rollNumber.toUpperCase() },
    });
    if (rollExists) {
      return NextResponse.json(
        { error: "This roll number is already registered" },
        { status: 409 }
      );
    }

    // Create profile + affinities + mark profileComplete in one transaction
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.academicProfile.create({
        data: {
          userId: session.user.id,
          rollNumber: validated.rollNumber.toUpperCase(),
          department: validated.department,
          year: validated.year,
          semester: validated.semester,
          subjectAffinities: {
            create: validated.strongSubjects.map((subject) => ({ subject })),
          },
        },
        include: { subjectAffinities: true },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { profileComplete: true },
      });

      return created;
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: (error as { issues: unknown }).issues,
        },
        { status: 400 }
      );
    }
    console.error("Academic profile creation error:", error);
    return NextResponse.json(
      { error: "Failed to create academic profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.academicProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "No academic profile found. Use POST to create." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = academicProfileSchema.parse(body);

    // Check roll number uniqueness if changed
    if (validated.rollNumber.toUpperCase() !== existing.rollNumber) {
      const rollExists = await prisma.academicProfile.findUnique({
        where: { rollNumber: validated.rollNumber.toUpperCase() },
      });
      if (rollExists) {
        return NextResponse.json(
          { error: "This roll number is already registered" },
          { status: 409 }
        );
      }
    }

    const profile = await prisma.$transaction(async (tx) => {
      // Delete old affinities and recreate
      await tx.subjectAffinity.deleteMany({
        where: { academicProfileId: existing.id },
      });

      const updated = await tx.academicProfile.update({
        where: { userId: session.user.id },
        data: {
          rollNumber: validated.rollNumber.toUpperCase(),
          department: validated.department,
          year: validated.year,
          semester: validated.semester,
          subjectAffinities: {
            create: validated.strongSubjects.map((subject) => ({ subject })),
          },
        },
        include: { subjectAffinities: true },
      });

      return updated;
    });

    return NextResponse.json(profile);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: (error as { issues: unknown }).issues,
        },
        { status: 400 }
      );
    }
    console.error("Academic profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update academic profile" },
      { status: 500 }
    );
  }
}
