import { UsersManager } from "@/components/admin/users-manager";
export const dynamic = "force-dynamic";
export const metadata = { title: "Users — Admin" };

export default function AdminUsersPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">Manage user roles and bans</p>
      </div>
      <UsersManager />
    </div>
  );
}
