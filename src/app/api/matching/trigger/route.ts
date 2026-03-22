import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { triggerMatching } from "@/lib/matching/engine";

export const dynamic = "force-dynamic";

/**
 * Runs the matching engine in a dedicated request (survives serverless timeouts
 * better than setTimeout inside another route). Clients schedule this ~30s after
 * joining the pool so helpers reliably get proposals + notifications.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await triggerMatching();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Matching trigger route error:", e);
    return NextResponse.json(
      { error: "Failed to run matching" },
      { status: 500 }
    );
  }
}
