import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acceptProposal } from "@/lib/matching/engine";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;
    const group = await acceptProposal(proposalId, session.user.id);

    return NextResponse.json({ group });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accept proposal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
