import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RealtimeGroupsPanel } from "@/components/matching/realtime-groups-panel";

export const metadata = {
  title: "My Groups — Peer Connect",
};

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <RealtimeGroupsPanel currentUserId={session.user.id} variant="groups" />
      </div>
    </div>
  );
}
