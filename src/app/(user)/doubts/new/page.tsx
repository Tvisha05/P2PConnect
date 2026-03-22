import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuickPoolEntryForm } from "@/components/doubts/quick-pool-entry-form";
import { RealtimeGroupsPanel } from "@/components/matching/realtime-groups-panel";

export const metadata = {
  title: "Matchmaking Pool — Peer Connect",
};

export default async function PostDoubtPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  if (!session.user.profileComplete) {
    redirect("/profile/setup");
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const defaultCategoryId = categories[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: pool entry */}
        <section className="w-full lg:w-[380px]">
          <div className="mb-6">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              Doubt Topic + Urgency
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Add your topic to the matching pool. Your matched groups will appear in real time.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {defaultCategoryId ? (
              <QuickPoolEntryForm
                defaultCategoryId={defaultCategoryId}
              />
            ) : (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  No active categories were found in the database, so the form is hidden.
                </p>
                <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-foreground">
                  <span className="font-medium text-foreground">Fix (local / first setup):</span>{" "}
                  ensure <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DATABASE_URL</code>{" "}
                  is set, then run{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    npx prisma db push
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    npx prisma db seed
                  </code>
                  . That creates categories with{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">isActive: true</code>.
                </p>
                <p>
                  If categories exist but are turned off, an admin must set them active again.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right: matched groups */}
        <section className="flex-1">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <RealtimeGroupsPanel currentUserId={session.user.id} variant="dashboard" />
          </div>
        </section>
      </div>
    </div>
  );
}
