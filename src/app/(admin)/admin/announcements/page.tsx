import { AnnouncementsManager } from "@/components/admin/announcements-manager";
export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements — Admin" };

export default function AdminAnnouncementsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">Announcements</h1>
        <p className="text-muted-foreground mt-1">Create and manage platform announcements</p>
      </div>
      <AnnouncementsManager />
    </div>
  );
}
