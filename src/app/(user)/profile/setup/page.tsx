import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AcademicProfileForm } from "@/components/profile/academic-profile-form";

export const metadata = {
  title: "Complete Your Profile — Peer Connect",
};

export default async function ProfileSetupPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.profileComplete) {
    redirect("/doubts/new");
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="animate-slide-up bg-card rounded-2xl border border-border shadow-xl shadow-black/[0.03] dark:shadow-black/30 p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-7 w-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
            Complete Your Academic Profile
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            We need a few academic details to match you with the right peers
          </p>
        </div>

        <AcademicProfileForm mode="setup" />
      </div>
    </div>
  );
}
