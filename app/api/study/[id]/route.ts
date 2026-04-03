import { NextRequest } from "next/server";
import { prisma } from "../../../../infrastructure/db/PrismaClient";

export const runtime = "nodejs";

// GET /api/study/[id] - fetch a single guide with all questions
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guide = await prisma.studyGuide.findUnique({
      where: { id },
      include: { questions: { orderBy: [{ status: "desc" }, { lastReviewedAt: "asc" }] } },
    });

    if (!guide) {
      return Response.json({ error: "Guide not found." }, { status: 404 });
    }

    // Parse hints JSON for each question
    const questions = guide.questions.map((q) => ({
      ...q,
      hints: JSON.parse(q.hints),
    }));

    // Struggled questions bubble to top of each category
    const sortedQuestions = [
      ...questions.filter((q) => q.status === "struggled"),
      ...questions.filter((q) => q.status === "unanswered"),
      ...questions.filter((q) => q.status === "got_it"),
    ];

    return Response.json({ guide: { ...guide, questions: sortedQuestions } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load guide";
    return Response.json({ error: message }, { status: 500 });
  }
}
