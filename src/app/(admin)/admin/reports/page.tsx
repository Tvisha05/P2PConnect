import { ReportsManager } from "@/components/admin/reports-manager";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — Admin" };

export default function AdminReportsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Review and resolve user-submitted reports</p>
      </div>
      <ReportsManager />
    </div>
  );
}
