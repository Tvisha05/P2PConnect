# P2PConnect — Missing UI Pages: Full Implementation Guide

> Build order: Announcements → User Profile → Leaderboard → Settings → Admin Dashboard

---

## Phase 1: Announcements Feed

### 1.1 Update `src/types/index.ts` — append at bottom

```typescript
export type AnnouncementWithAuthor = {
  id: string;
  title: string;
  body: string;
  sendEmail: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: Pick<User, "id" | "name" | "image">;
};
```

---

### 1.2 `src/app/api/announcements/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = Math.min(20, Math.max(1, parseInt(url.get("limit") ?? "10")));

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.announcement.count(),
  ]);

  return NextResponse.json({
    announcements,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
```

---

### 1.3 `src/app/api/announcements/[announcementId]/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const { announcementId } = await params;

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ announcement });
}
```

---

### 1.4 `src/app/(public)/announcements/page.tsx` — NEW FILE

```typescript
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatRelativeTime, truncate } from "@/lib/utils";
import { ServerPagination } from "@/components/ui/server-pagination";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Announcements — Peer Connect",
  description: "Platform announcements and updates",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  const limit = 10;

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { author: { select: { id: true, name: true, image: true } } },
    }),
    prisma.announcement.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
          Announcements
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform updates and important notices
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Link
              key={a.id}
              href={`/announcements/${a.id}`}
              className="group block rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300"
            >
              <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                {a.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {truncate(a.body, 200)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                  {a.author.name?.charAt(0)?.toUpperCase() ?? "A"}
                </span>
                <span>{a.author.name}</span>
                <span>·</span>
                <span>{formatRelativeTime(a.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <ServerPagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/announcements"
          />
        </div>
      )}
    </div>
  );
}
```

---

### 1.5 `src/app/(public)/announcements/[announcementId]/page.tsx` — NEW FILE

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const a = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { title: true },
  });
  return { title: a ? `${a.title} — Peer Connect` : "Announcement Not Found" };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  if (!announcement) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/announcements" className="hover:text-foreground transition-colors">
          Announcements
        </Link>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-foreground truncate max-w-[300px]">{announcement.title}</span>
      </nav>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight mb-4">
          {announcement.title}
        </h1>

        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {announcement.author.name?.charAt(0)?.toUpperCase() ?? "A"}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{announcement.author.name}</p>
            <p className="text-xs text-muted-foreground">{formatDate(announcement.createdAt)}</p>
          </div>
        </div>

        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {announcement.body}
        </div>
      </div>
    </div>
  );
}
```

---

### 1.6 Update `src/components/layout/navbar.tsx`

Change the `navLinks` array from:
```typescript
const navLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/tags", label: "Tags" },
];
```
To:
```typescript
const navLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/tags", label: "Tags" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/announcements", label: "Announcements" },
];
```

Also add an Admin link in the profile dropdown. In the `DropdownLink` section (inside the `profileOpen` div), add before Settings:

```typescript
{(session.user as { role?: string })?.role === "ADMIN" ||
 (session.user as { role?: string })?.role === "MODERATOR" ? (
  <DropdownLink href="/admin">Admin Panel</DropdownLink>
) : null}
```

---

## Phase 2: Public User Profile

### 2.1 `src/app/api/users/[userId]/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!/^[a-f\d]{24}$/i.test(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      karma: true,
      role: true,
      createdAt: true,
      lastActiveAt: true,
      isBanned: true,
      academicProfile: {
        select: {
          department: true,
          year: true,
          semester: true,
          subjectAffinities: { select: { subject: true } },
        },
      },
    },
  });

  if (!user || user.isBanned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [doubtsPosted, doubtsHelped] = await Promise.all([
    prisma.doubt.count({ where: { seekerId: userId } }),
    prisma.doubt.count({ where: { helperId: userId, status: "RESOLVED" } }),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      strongSubjects: user.academicProfile?.subjectAffinities.map((s) => s.subject) ?? [],
      stats: { doubtsPosted, doubtsHelped },
    },
  });
}
```

---

### 2.2 `src/app/api/users/[userId]/doubts/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const doubtInclude = {
  seeker: { select: { id: true, name: true, image: true } },
  helper: { select: { id: true, name: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  attachments: true,
  _count: { select: { messages: true, bookmarks: true } },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!/^[a-f\d]{24}$/i.test(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = req.nextUrl.searchParams;
  const type = url.get("type") === "helped" ? "helped" : "posted";
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = Math.min(20, Math.max(1, parseInt(url.get("limit") ?? "10")));

  const where = type === "posted" ? { seekerId: userId } : { helperId: userId };

  const [doubts, total] = await Promise.all([
    prisma.doubt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: doubtInclude,
    }),
    prisma.doubt.count({ where }),
  ]);

  return NextResponse.json({ doubts, total, page, totalPages: Math.ceil(total / limit) });
}
```

---

### 2.3 `src/components/profile/user-profile-tabs.tsx` — NEW FILE

```typescript
"use client";

import { useState, useEffect } from "react";
import { DoubtCard } from "@/components/doubts/doubt-card";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { DoubtWithRelations } from "@/types";

type Tab = "posted" | "helped";

export function UserProfileTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("posted");
  const [doubts, setDoubts] = useState<DoubtWithRelations[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}/doubts?type=${tab}&page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setDoubts(data.doubts ?? []);
        setTotalPages(data.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [userId, tab, page]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {(["posted", "helped"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "posted" ? "Doubts Posted" : "Doubts Helped"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
              <div className="h-4 w-1/2 rounded bg-muted mb-3" />
              <div className="h-4 w-full rounded bg-muted mb-2" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : doubts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {tab === "posted" ? "No doubts posted yet." : "Hasn't helped on any doubts yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => (
            <DoubtCard key={doubt.id} doubt={doubt} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
```

---

### 2.4 `src/app/(public)/users/[userId]/page.tsx` — NEW FILE

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserProfileTabs } from "@/components/profile/user-profile-tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return { title: user ? `${user.name} — Peer Connect` : "User Not Found" };
}

const DEPT_LABELS: Record<string, string> = {
  CSE: "CSE", ECE: "ECE", EEE: "EEE", ME: "ME", CE: "CE",
  IT: "IT", AI_ML: "AI/ML", DS: "DS", CIVIL: "Civil", OTHER: "Other",
};

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  if (!/^[a-f\d]{24}$/i.test(userId)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, image: true, bio: true,
      karma: true, role: true, createdAt: true, isBanned: true,
      academicProfile: {
        select: {
          department: true, year: true,
          subjectAffinities: { select: { subject: true } },
        },
      },
    },
  });

  if (!user || user.isBanned) notFound();

  const [doubtsPosted, doubtsHelped] = await Promise.all([
    prisma.doubt.count({ where: { seekerId: userId } }),
    prisma.doubt.count({ where: { helperId: userId, status: "RESOLVED" } }),
  ]);

  const strongSubjects = user.academicProfile?.subjectAffinities.map((s) => s.subject) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Profile Header */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary shrink-0">
            {user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
                {user.name}
              </h1>
              {user.role !== "USER" && (
                <Badge variant="primary">{user.role}</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground mb-3">
              {user.academicProfile && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  {DEPT_LABELS[user.academicProfile.department]} · Year {user.academicProfile.year}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {user.karma} karma
              </span>
              <span>Joined {formatDate(user.createdAt)}</span>
            </div>

            {user.bio && (
              <p className="text-sm text-foreground leading-relaxed">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          {[
            { label: "Doubts Posted", value: doubtsPosted },
            { label: "Peers Helped", value: doubtsHelped },
            { label: "Karma", value: user.karma },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Strong Subjects */}
        {strongSubjects.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Strong Subjects
            </p>
            <div className="flex flex-wrap gap-2">
              {strongSubjects.map((s) => (
                <span
                  key={s}
                  className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <UserProfileTabs userId={userId} />
    </div>
  );
}
```

---

## Phase 3: Leaderboard

### 3.1 `src/app/api/leaderboard/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LeaderboardPeriod } from "@/types";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams;
  const period = (url.get("period") ?? "all_time") as LeaderboardPeriod;
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.get("limit") ?? "20")));

  const validPeriods: LeaderboardPeriod[] = ["all_time", "monthly", "weekly"];
  if (!validPeriods.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  if (period === "all_time") {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { isBanned: false },
        orderBy: { karma: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, image: true, karma: true,
          academicProfile: { select: { department: true } } },
      }),
      prisma.user.count({ where: { isBanned: false } }),
    ]);

    const entries = users.map((u, i) => ({
      userId: u.id, name: u.name, image: u.image, karma: u.karma,
      department: u.academicProfile?.department ?? null,
      rank: (page - 1) * limit + i + 1,
    }));

    return NextResponse.json({ entries, total, page, totalPages: Math.ceil(total / limit) });
  }

  const now = new Date();
  const periodStart = period === "weekly"
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const grouped = await prisma.karmaEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: periodStart } },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.karmaEvent
    .groupBy({ by: ["userId"], where: { createdAt: { gte: periodStart } } })
    .then((r) => r.length);

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isBanned: false },
    select: { id: true, name: true, image: true, karma: true,
      academicProfile: { select: { department: true } } },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const entries = grouped
    .filter((g) => userMap.has(g.userId))
    .map((g, i) => {
      const u = userMap.get(g.userId)!;
      return {
        userId: u.id, name: u.name, image: u.image,
        karma: g._sum.delta ?? 0,
        department: u.academicProfile?.department ?? null,
        rank: (page - 1) * limit + i + 1,
      };
    });

  return NextResponse.json({ entries, total, page, totalPages: Math.ceil(total / limit) });
}
```

---

### 3.2 `src/components/leaderboard/leaderboard-client.tsx` — NEW FILE

```typescript
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { LeaderboardPeriod } from "@/types";

type Entry = {
  userId: string; name: string | null; image: string | null;
  karma: number; department: string | null; rank: number;
};

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "monthly", label: "This Month" },
  { value: "weekly", label: "This Week" },
];

const DEPT_LABELS: Record<string, string> = {
  CSE: "CSE", ECE: "ECE", EEE: "EEE", ME: "ME", CE: "CE",
  IT: "IT", AI_ML: "AI/ML", DS: "DS", CIVIL: "Civil", OTHER: "Other",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardClient() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}&page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotalPages(data.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [period, page]);

  const switchPeriod = (p: LeaderboardPeriod) => {
    setPeriod(p);
    setPage(1);
  };

  return (
    <div>
      {/* Period filter */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => switchPeriod(p.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
              period === p.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No data for this period yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {entries.map((entry, i) => (
            <Link
              key={entry.userId}
              href={`/users/${entry.userId}`}
              className={cn(
                "flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors",
                i !== entries.length - 1 && "border-b border-border"
              )}
            >
              {/* Rank */}
              <div className="w-8 text-center shrink-0">
                {entry.rank <= 3 ? (
                  <span className="text-lg">{MEDALS[entry.rank - 1]}</span>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>

              {/* Name + department */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                {entry.department && (
                  <p className="text-xs text-muted-foreground">
                    {DEPT_LABELS[entry.department] ?? entry.department}
                  </p>
                )}
              </div>

              {/* Karma */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{entry.karma}</p>
                <p className="text-xs text-muted-foreground">karma</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
```

---

### 3.3 `src/app/(public)/leaderboard/page.tsx` — NEW FILE

```typescript
import { LeaderboardClient } from "@/components/leaderboard/leaderboard-client";

export const metadata = {
  title: "Leaderboard — Peer Connect",
  description: "Top contributors ranked by karma",
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
          Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">Top contributors ranked by karma</p>
      </div>
      <LeaderboardClient />
    </div>
  );
}
```

---

## Phase 4: Settings Expansion

### 4.1 Update `src/lib/validators.ts` — append at bottom

```typescript
export const emailPreferencesSchema = z.object({
  doubtClaimed: z.boolean().optional(),
  newMessage: z.boolean().optional(),
  doubtResolved: z.boolean().optional(),
  tagNewDoubt: z.boolean().optional(),
  announcements: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
});
```

---

### 4.2 `src/app/api/profile/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validators";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, bio: true, image: true, email: true, karma: true, role: true },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: result.data,
    select: { id: true, name: true, bio: true, image: true },
  });

  return NextResponse.json({ user });
}
```

---

### 4.3 `src/app/api/profile/password/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = changePasswordSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "No password set on this account" }, { status: 400 });
  }

  const valid = await bcrypt.compare(result.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(result.data.newPassword, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: newHash } });

  return NextResponse.json({ message: "Password updated successfully" });
}
```

---

### 4.4 `src/app/api/profile/email-preferences/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailPreferencesSchema } from "@/lib/validators";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.emailPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  return NextResponse.json({ prefs });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = emailPreferencesSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const prefs = await prisma.emailPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...result.data },
    update: result.data,
  });

  return NextResponse.json({ prefs });
}
```

---

### 4.5 `src/components/settings/profile-edit-form.tsx` — NEW FILE

```typescript
"use client";

import { useState } from "react";

type Props = {
  initialData: { name: string; bio: string | null; image: string | null };
};

export function ProfileEditForm({ initialData }: Props) {
  const [form, setForm] = useState({
    name: initialData.name ?? "",
    bio: initialData.bio ?? "",
    image: initialData.image ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          bio: form.bio || undefined,
          image: form.image || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Failed to save" }); return; }
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          placeholder="Your name"
          maxLength={50}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Bio
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            {form.bio.length}/500
          </span>
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
          placeholder="Tell others about yourself..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Avatar URL
          <span className="text-muted-foreground font-normal ml-2 text-xs">optional</span>
        </label>
        <input
          type="url"
          value={form.image}
          onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          placeholder="https://example.com/avatar.png"
        />
      </div>

      {message && (
        <div className={`rounded-xl p-4 text-sm border ${
          message.type === "success"
            ? "bg-success/10 text-success border-success/20"
            : "bg-destructive/10 text-destructive border-destructive/20"
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
      >
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
```

---

### 4.6 `src/components/settings/password-change-form.tsx` — NEW FILE

```typescript
"use client";

import { useState } from "react";

export function PasswordChangeForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Failed to update password" }); return; }
      setMessage({ type: "success", text: "Password updated successfully" });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const field = (id: keyof typeof form, label: string, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type="password"
        id={id}
        value={form[id]}
        onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        placeholder={placeholder}
        required
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {field("currentPassword", "Current Password", "Enter current password")}
      {field("newPassword", "New Password", "At least 8 characters")}
      {field("confirmPassword", "Confirm New Password", "Repeat new password")}

      {message && (
        <div className={`rounded-xl p-4 text-sm border ${
          message.type === "success"
            ? "bg-success/10 text-success border-success/20"
            : "bg-destructive/10 text-destructive border-destructive/20"
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
```

---

### 4.7 `src/components/settings/email-preferences-form.tsx` — NEW FILE

```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Prefs = {
  doubtClaimed: boolean; newMessage: boolean; doubtResolved: boolean;
  tagNewDoubt: boolean; announcements: boolean; weeklyDigest: boolean;
};

const PREF_LABELS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "doubtClaimed", label: "Doubt Claimed", description: "When a peer claims your doubt" },
  { key: "newMessage", label: "New Message", description: "When you receive a new chat message" },
  { key: "doubtResolved", label: "Doubt Resolved", description: "When your doubt is marked resolved" },
  { key: "tagNewDoubt", label: "Tag Activity", description: "When a new doubt is posted with your followed tags" },
  { key: "announcements", label: "Announcements", description: "Platform updates and important notices" },
  { key: "weeklyDigest", label: "Weekly Digest", description: "A weekly summary of activity" },
];

export function EmailPreferencesForm({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);

  const toggle = async (key: keyof Prefs) => {
    const newVal = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: newVal }));
    setSaving(key);
    try {
      await fetch("/api/profile/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !newVal }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {PREF_LABELS.map(({ key, label, description }) => (
        <div key={key} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            disabled={saving === key}
            onClick={() => toggle(key)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-60",
              prefs[key] ? "bg-primary" : "bg-muted border border-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                prefs[key] ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### 4.8 Replace `src/app/(user)/settings/page.tsx`

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AcademicProfileForm } from "@/components/profile/academic-profile-form";
import { ProfileEditForm } from "@/components/settings/profile-edit-form";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { EmailPreferencesForm } from "@/components/settings/email-preferences-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings — Peer Connect" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [user, academicProfile, emailPrefs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, bio: true, image: true },
    }),
    prisma.academicProfile.findUnique({
      where: { userId: session.user.id },
      include: { subjectAffinities: true },
    }),
    prisma.emailPreference.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    }),
  ]);

  const academicInitialData = academicProfile
    ? {
        rollNumber: academicProfile.rollNumber,
        department: academicProfile.department,
        year: academicProfile.year,
        semester: academicProfile.semester,
        strongSubjects: academicProfile.subjectAffinities.map((a) => a.subject),
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
        Settings
      </h1>

      {/* Profile */}
      <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update your public display information
          </p>
        </div>
        <ProfileEditForm
          initialData={{
            name: user?.name ?? "",
            bio: user?.bio ?? null,
            image: user?.image ?? null,
          }}
        />
      </section>

      {/* Academic Profile */}
      <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Academic Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your academic details used for peer matching
          </p>
        </div>
        {academicInitialData ? (
          <AcademicProfileForm mode="edit" initialData={academicInitialData} />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t set up your academic profile yet.
            </p>
            <a
              href="/profile/setup"
              className="inline-flex rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Set Up Profile
            </a>
          </div>
        )}
      </section>

      {/* Password */}
      <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update your account password
          </p>
        </div>
        <PasswordChangeForm />
      </section>

      {/* Email Preferences */}
      <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Email Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which emails you want to receive
          </p>
        </div>
        <EmailPreferencesForm
          initialPrefs={{
            doubtClaimed: emailPrefs.doubtClaimed,
            newMessage: emailPrefs.newMessage,
            doubtResolved: emailPrefs.doubtResolved,
            tagNewDoubt: emailPrefs.tagNewDoubt,
            announcements: emailPrefs.announcements,
            weeklyDigest: emailPrefs.weeklyDigest,
          }}
        />
      </section>
    </div>
  );
}
```

---

## Phase 5: Admin Dashboard

### 5.1 `src/app/(admin)/layout.tsx` — NEW FILE

```typescript
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
```

---

### 5.2 `src/components/admin/admin-sidebar.tsx` — NEW FILE

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: "▦" },
  { href: "/admin/reports", label: "Reports", icon: "⚑" },
  { href: "/admin/users", label: "Users", icon: "⊙" },
  { href: "/admin/announcements", label: "Announcements", icon: "✉" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-56 border-r border-border bg-card hidden md:flex flex-col py-4 px-3 z-40">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
        Admin Panel
      </p>
      <nav className="space-y-1">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

### 5.3 `src/app/(admin)/admin/page.tsx` — NEW FILE

```typescript
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
```

---

### 5.4 `src/app/api/admin/reports/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = req.nextUrl.searchParams;
  const status = url.get("status");
  const targetType = url.get("targetType");
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status && ["PENDING","REVIEWED","RESOLVED","DISMISSED"].includes(status)) where.status = status;
  if (targetType && ["DOUBT","MESSAGE","USER"].includes(targetType)) where.targetType = targetType;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      include: {
        reporter: { select: { id: true, name: true, image: true } },
        targetUser: { select: { id: true, name: true } },
        doubt: { select: { id: true, title: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({ reports, total, page, totalPages: Math.ceil(total / limit) });
}
```

---

### 5.5 `src/app/api/admin/reports/[reportId]/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateReportSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reportId } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateReportSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: result.data.status,
      adminNotes: result.data.adminNotes,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ report });
}
```

---

### 5.6 `src/components/admin/reports-manager.tsx` — NEW FILE

```typescript
"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Report = {
  id: string; reason: string; status: string; targetType: string;
  adminNotes: string | null; createdAt: string;
  reporter: { id: string; name: string | null };
  targetUser: { id: string; name: string | null } | null;
  doubt: { id: string; title: string } | null;
};

const STATUS_OPTIONS = ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const;
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  REVIEWED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  RESOLVED: "bg-success/10 text-success",
  DISMISSED: "bg-muted text-muted-foreground",
};

export function ReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<string>("RESOLVED");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports?status=${statusFilter}&page=${page}`)
      .then((r) => r.json())
      .then((d) => { setReports(d.reports ?? []); setTotalPages(d.totalPages ?? 1); })
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  const openReport = (r: Report) => {
    setExpanded(r.id);
    setEditNotes(r.adminNotes ?? "");
    setEditStatus("RESOLVED");
  };

  const saveReport = async (id: string) => {
    setSaving(true);
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: editStatus, adminNotes: editNotes }),
    });
    setSaving(false);
    setExpanded(null);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: editStatus, adminNotes: editNotes } : r));
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-16" />
        ))}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No {statusFilter.toLowerCase()} reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[r.status])}>{r.status}</span>
                    <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">{r.targetType}</span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground mt-1">
                    <span className="font-medium">{r.reporter.name}</span> reported:{" "}
                    {r.doubt ? `"${r.doubt.title}"` : r.targetUser?.name ?? "unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.reason}</p>
                </div>
                <button onClick={() => openReport(r)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors">
                  Review
                </button>
              </div>

              {expanded === r.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <p className="text-sm font-medium text-foreground">Full reason:</p>
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Admin Notes</label>
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                      className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {STATUS_OPTIONS.filter((s) => s !== "PENDING").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button onClick={() => saveReport(r.id)} disabled={saving}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setExpanded(null)}
                      className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-muted transition-colors">←</button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-muted transition-colors">→</button>
        </div>
      )}
    </div>
  );
}
```

---

### 5.7 `src/app/(admin)/admin/reports/page.tsx` — NEW FILE

```typescript
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
```

---

### 5.8 `src/app/api/admin/users/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = req.nextUrl.searchParams;
  const search = url.get("search");
  const roleFilter = url.get("role");
  const bannedFilter = url.get("banned");
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) where.OR = [
    { name: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
  ];
  if (roleFilter && ["USER","MODERATOR","ADMIN"].includes(roleFilter)) where.role = roleFilter;
  if (bannedFilter === "true") where.isBanned = true;
  if (bannedFilter === "false") where.isBanned = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      select: { id: true, name: true, email: true, image: true, role: true,
        karma: true, isBanned: true, bannedAt: true, banReason: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}
```

---

### 5.9 `src/app/api/admin/users/[userId]/role/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserRoleSchema } from "@/lib/validators";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
  }

  const { userId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateUserRoleSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: result.data.role },
    select: { id: true, role: true },
  });

  return NextResponse.json({ user });
}
```

---

### 5.10 `src/app/api/admin/users/[userId]/ban/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { banUserSchema } from "@/lib/validators";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  if (userId === session.user.id) return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = banUserSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: true, bannedAt: new Date(), banReason: result.data.reason },
    select: { id: true, isBanned: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: false, bannedAt: null, banReason: null },
    select: { id: true, isBanned: true },
  });

  return NextResponse.json({ user });
}
```

---

### 5.11 `src/components/admin/users-manager.tsx` — NEW FILE

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

type User = {
  id: string; name: string | null; email: string; role: string;
  karma: number; isBanned: boolean; bannedAt: string | null; banReason: string | null; createdAt: string;
};

const ROLE_OPTIONS = ["USER", "MODERATOR", "ADMIN"] as const;
const ROLE_COLORS: Record<string, string> = {
  USER: "bg-muted text-muted-foreground",
  MODERATOR: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ADMIN: "bg-primary/10 text-primary",
};

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [banModal, setBanModal] = useState<{ userId: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [saving, setSaving] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (roleFilter) params.set("role", roleFilter);
    if (bannedFilter) params.set("banned", bannedFilter);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setTotalPages(d.totalPages ?? 1); })
      .finally(() => setLoading(false));
  }, [debouncedSearch, roleFilter, bannedFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (userId: string, role: string) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
  };

  const banUser = async () => {
    if (!banModal) return;
    setSaving(true);
    await fetch(`/api/admin/users/${banModal.userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: banReason }),
    });
    setSaving(false);
    setBanModal(null);
    setBanReason("");
    setUsers((prev) => prev.map((u) => u.id === banModal.userId ? { ...u, isBanned: true } : u));
  };

  const unbanUser = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}/ban`, { method: "DELETE" });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isBanned: false } : u));
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or email..."
          className="flex-1 min-w-48 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={bannedFilter} onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Users</option>
          <option value="true">Banned Only</option>
          <option value="false">Active Only</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-14" />
        ))}</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {users.map((u, i) => (
            <div key={u.id} className={cn("flex items-center gap-4 px-5 py-4", i !== users.length - 1 && "border-b border-border")}>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {u.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  {u.isBanned && <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Banned</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
                <span className="text-xs font-medium text-muted-foreground">{u.karma} karma</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[u.role])}>{u.role}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {u.isBanned ? (
                  <button onClick={() => unbanUser(u.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors">
                    Unban
                  </button>
                ) : (
                  <button onClick={() => setBanModal({ userId: u.id, name: u.name ?? "this user" })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors">
                    Ban
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-muted transition-colors">←</button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-muted transition-colors">→</button>
        </div>
      )}

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Ban {banModal.name}
            </h3>
            <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
            <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3}
              placeholder="Explain the reason for this ban..."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={banUser} disabled={saving || banReason.length < 5}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors">
                {saving ? "Banning..." : "Confirm Ban"}
              </button>
              <button onClick={() => { setBanModal(null); setBanReason(""); }}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 5.12 `src/app/(admin)/admin/users/page.tsx` — NEW FILE

```typescript
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
```

---

### 5.13 `src/app/api/admin/announcements/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAnnouncementSchema } from "@/lib/validators";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(url.get("page") ?? "1"));
  const limit = 20;

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.announcement.count(),
  ]);

  return NextResponse.json({ announcements, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createAnnouncementSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: { ...result.data, authorId: session.user.id },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
```

---

### 5.14 `src/app/api/admin/announcements/[announcementId]/route.ts` — NEW FILE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAnnouncementSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.string().min(10).max(5000).optional(),
});

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MODERATOR") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { announcementId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateAnnouncementSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: result.data,
  });

  return NextResponse.json({ announcement });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { announcementId } = await params;
  await prisma.announcement.delete({ where: { id: announcementId } });
  return NextResponse.json({ message: "Deleted" });
}
```

---

### 5.15 `src/components/admin/announcements-manager.tsx` — NEW FILE

```typescript
"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";

type Announcement = {
  id: string; title: string; body: string; sendEmail: boolean; createdAt: string;
  author: { id: string; name: string | null };
};

export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", sendEmail: false });
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements ?? []))
      .finally(() => setLoading(false));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setAnnouncements((prev) => [data.announcement, ...prev]);
      setForm({ title: "", body: "", sendEmail: false });
    }
    setCreating(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    await fetch(`/api/admin/announcements/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setAnnouncements((prev) => prev.map((a) => a.id === editId ? { ...a, ...editForm } : a));
    setSaving(false);
    setEditId(null);
  };

  const deleteAnnouncement = async (id: string) => {
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">New Announcement</h2>
        <form onSubmit={create} className="space-y-4">
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Announcement title" required maxLength={200}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            placeholder="Announcement body..." required rows={4} maxLength={5000}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={form.sendEmail}
                onChange={(e) => setForm((p) => ({ ...p, sendEmail: e.target.checked }))}
                className="rounded border-input" />
              Send email to subscribed users
            </label>
            <button type="submit" disabled={creating || form.title.length < 3 || form.body.length < 10}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
              {creating ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-20" />
        ))}</div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
              {editId === a.id ? (
                <div className="space-y-3">
                  <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <textarea value={editForm.body} onChange={(e) => setEditForm((p) => ({ ...p, body: e.target.value }))}
                    rows={3} className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {a.author.name} · {formatRelativeTime(a.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setEditId(a.id); setEditForm({ title: a.title, body: a.body }); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setDeleteId(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Announcement?</h3>
            <p className="text-sm text-muted-foreground mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteAnnouncement(deleteId)}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors">
                Delete
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 5.16 `src/app/(admin)/admin/announcements/page.tsx` — NEW FILE

```typescript
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
```

---

## Summary: Complete File List

| # | File | Action |
|---|------|--------|
| 1 | `src/types/index.ts` | Append `AnnouncementWithAuthor` |
| 2 | `src/app/api/announcements/route.ts` | Create |
| 3 | `src/app/api/announcements/[announcementId]/route.ts` | Create |
| 4 | `src/app/(public)/announcements/page.tsx` | Create |
| 5 | `src/app/(public)/announcements/[announcementId]/page.tsx` | Create |
| 6 | `src/components/layout/navbar.tsx` | Add 2 nav links + admin dropdown link |
| 7 | `src/app/api/users/[userId]/route.ts` | Create |
| 8 | `src/app/api/users/[userId]/doubts/route.ts` | Create |
| 9 | `src/components/profile/user-profile-tabs.tsx` | Create |
| 10 | `src/app/(public)/users/[userId]/page.tsx` | Create |
| 11 | `src/app/api/leaderboard/route.ts` | Create |
| 12 | `src/components/leaderboard/leaderboard-client.tsx` | Create |
| 13 | `src/app/(public)/leaderboard/page.tsx` | Create |
| 14 | `src/lib/validators.ts` | Append `emailPreferencesSchema` |
| 15 | `src/app/api/profile/route.ts` | Create |
| 16 | `src/app/api/profile/password/route.ts` | Create |
| 17 | `src/app/api/profile/email-preferences/route.ts` | Create |
| 18 | `src/components/settings/profile-edit-form.tsx` | Create |
| 19 | `src/components/settings/password-change-form.tsx` | Create |
| 20 | `src/components/settings/email-preferences-form.tsx` | Create |
| 21 | `src/app/(user)/settings/page.tsx` | Replace |
| 22 | `src/app/(admin)/layout.tsx` | Create |
| 23 | `src/components/admin/admin-sidebar.tsx` | Create |
| 24 | `src/app/(admin)/admin/page.tsx` | Create |
| 25 | `src/app/api/admin/reports/route.ts` | Create |
| 26 | `src/app/api/admin/reports/[reportId]/route.ts` | Create |
| 27 | `src/components/admin/reports-manager.tsx` | Create |
| 28 | `src/app/(admin)/admin/reports/page.tsx` | Create |
| 29 | `src/app/api/admin/users/route.ts` | Create |
| 30 | `src/app/api/admin/users/[userId]/role/route.ts` | Create |
| 31 | `src/app/api/admin/users/[userId]/ban/route.ts` | Create |
| 32 | `src/components/admin/users-manager.tsx` | Create |
| 33 | `src/app/(admin)/admin/users/page.tsx` | Create |
| 34 | `src/app/api/admin/announcements/route.ts` | Create |
| 35 | `src/app/api/admin/announcements/[announcementId]/route.ts` | Create |
| 36 | `src/components/admin/announcements-manager.tsx` | Create |
| 37 | `src/app/(admin)/admin/announcements/page.tsx` | Create |

**Total: 37 files (6 modified, 31 new)**

---

## Notes

- `bcryptjs` is already used by NextAuth for `passwordHash` — no new dependency needed
- The `(admin)` route group renders pages at `/admin` — the folder name is just for grouping
- All admin API routes check role on every request — the middleware is defense-in-depth only
- `emailPreferencesSchema` uses `.optional()` on each field so you can PATCH individual toggles
- The leaderboard `groupBy` for weekly/monthly requires MongoDB aggregation support in Prisma v5 — it is supported
- `ServerPagination` is imported from `@/components/ui/server-pagination` — check that this component exists in your project; if the file is named differently adjust the import
