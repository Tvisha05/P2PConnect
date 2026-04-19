import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ActivityFeed } from "@/components/activity/activity-feed";

export const metadata = {
  title: "My Activity — Peer Connect",
};

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-foreground mb-6">My Activity</h1>
      <ActivityFeed />
    </div>
  );
}
