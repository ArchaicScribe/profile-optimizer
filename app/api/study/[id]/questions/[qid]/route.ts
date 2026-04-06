import { NextRequest } from "next/server";
import { prisma } from "../../../../../../infrastructure/db/PrismaClient";

export const runtime = "nodejs";

// PATCH /api/study/[id]/questions/[qid]
// Body: { status: "got_it" | "struggled" | "unanswered" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { qid } = await params;
    const body = await req.json();
    const { status } = body as { status: "got_it" | "struggled" | "unanswered" };

    if (!["got_it", "struggled", "unanswered"].includes(status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }

    const question = await prisma.studyQuestion.update({
      where: { id: qid },
      data: {
        status,
        reviewCount: { increment: status !== "unanswered" ? 1 : 0 },
        lastReviewedAt: status !== "unanswered" ? new Date() : undefined,
      },
    });

    return Response.json({ question });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update question";
    return Response.json({ error: message }, { status: 500 });
  }
}
