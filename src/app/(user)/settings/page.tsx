import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AcademicProfileForm } from "@/components/profile/academic-profile-form";

export const metadata = {
  title: "Settings — Peer Connect",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const academicProfile = await prisma.academicProfile.findUnique({
    where: { userId: session.user.id },
    include: { subjectAffinities: true },
  });

  const initialData = academicProfile
    ? {
        rollNumber: academicProfile.rollNumber,
        department: academicProfile.department,
        year: academicProfile.year,
        semester: academicProfile.semester,
        strongSubjects: academicProfile.subjectAffinities.map((a) => a.subject),
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight mb-8">
        Settings
      </h1>

      {/* Academic Profile Section */}
      <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Academic Profile
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your academic details used for peer matching
          </p>
        </div>

        {initialData ? (
          <AcademicProfileForm mode="edit" initialData={initialData} />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t set up your academic profile yet.
            </p>
            <a
              href="/profile/setup"
              className="inline-flex rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Set Up Profile
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
