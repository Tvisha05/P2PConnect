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

      <UserProfileTabs userId={userId} />
    </div>
  );
}
