import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Peer Connect" };

export default async function AdminOverviewPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, bannedUsers, newUsers,
    totalDoubts, openDoubts, resolvedDoubts,
    pendingReports, totalAnnouncements,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.doubt.count(),
    prisma.doubt.count({ where: { status: "OPEN" } }),
    prisma.doubt.count({ where: { status: "RESOLVED" } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.announcement.count(),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers, sub: `+${newUsers} this week`, href: "/admin/users" },
    { label: "Banned Users", value: bannedUsers, sub: "active bans", href: "/admin/users?banned=true" },
    { label: "Total Doubts", value: totalDoubts, sub: `${openDoubts} open`, href: "/feed" },
    { label: "Resolved Doubts", value: resolvedDoubts, sub: `${Math.round((resolvedDoubts / Math.max(totalDoubts, 1)) * 100)}% rate`, href: null },
    { label: "Pending Reports", value: pendingReports, sub: "need review", href: "/admin/reports" },
    { label: "Announcements", value: totalAnnouncements, sub: "published", href: "/admin/announcements" },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
          Admin Overview
        </h1>
        <p className="text-muted-foreground mt-1">Platform health at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, href }) => {
          const card = (
            <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
              <p className="text-3xl font-semibold text-foreground">{value}</p>
              <p className="text-sm font-medium text-foreground mt-1">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          );
          return href ? (
            <Link key={label} href={href}>{card}</Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
