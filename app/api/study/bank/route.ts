import { NextRequest } from "next/server";
import { prisma } from "../../../../infrastructure/db/PrismaClient";

export const runtime = "nodejs";

// GET /api/study/bank
// Query params: category?, difficulty?, status?, company?, q? (search)
// Returns questions across all guides enriched with attempt stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? undefined;
    const difficulty = searchParams.get("difficulty") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const company = searchParams.get("company") ?? undefined;
    const q = searchParams.get("q") ?? undefined;

    const questions = await prisma.studyQuestion.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(status ? { status } : {}),
        ...(q ? { OR: [{ prompt: { contains: q } }, { topic: { contains: q } }] } : {}),
        ...(company ? { guide: { company: { contains: company } } } : {}),
      },
      include: {
        guide: { select: { id: true, jobTitle: true, company: true } },
        attempts: {
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, score: true, createdAt: true },
        },
      },
      orderBy: [
        // Struggled questions that have never been got_it sort first
        { status: "desc" },
        { lastReviewedAt: "asc" },
      ],
    });

    const enriched = questions.map((q) => {
      const totalAttempts = q.attempts.length;
      const struggledCount = q.attempts.filter((a) => a.status === "struggled").length;
      const gotItCount = q.attempts.filter((a) => a.status === "got_it").length;
      const scores = q.attempts.map((a) => a.score).filter((s): s is number => s !== null);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : null;
      const lastAttempt = q.attempts[0] ?? null;

      return {
        id: q.id,
        guideId: q.guideId,
        guide: q.guide,
        category: q.category,
        difficulty: q.difficulty,
        topic: q.topic,
        prompt: q.prompt,
        status: q.status,
        reviewCount: q.reviewCount,
        lastReviewedAt: q.lastReviewedAt,
        stats: {
          totalAttempts,
          struggledCount,
          gotItCount,
          avgScore,
          lastAttemptAt: lastAttempt?.createdAt ?? null,
          lastAttemptStatus: lastAttempt?.status ?? null,
        },
      };
    });

    // Collect distinct companies for filter UI
    const companies = await prisma.studyGuide.findMany({
      select: { company: true },
      distinct: ["company"],
      orderBy: { company: "asc" },
    });

    return Response.json({
      questions: enriched,
      total: enriched.length,
      companies: companies.map((c) => c.company),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load bank";
    return Response.json({ error: message }, { status: 500 });
  }
}
