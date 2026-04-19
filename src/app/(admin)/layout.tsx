import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") redirect("/");

  return (
    <div className="flex min-h-screen pt-16">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 ml-0 md:ml-56">{children}</main>
    </div>
  );
}
