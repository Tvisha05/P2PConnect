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
              <div className="text-sm text-muted-foreground">
                No active categories found. Please ask an admin to activate at least one category.
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
