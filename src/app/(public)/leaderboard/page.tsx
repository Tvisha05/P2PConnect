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
