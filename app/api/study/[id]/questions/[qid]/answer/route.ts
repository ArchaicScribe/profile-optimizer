import { NextRequest } from "next/server";
import { prisma } from "../../../../../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../../../../../infrastructure/ai/ClaudeClient";
import { extractJson, tryParseJson } from "../../../../../../../lib/extractJson";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior software engineer and interview coach evaluating a candidate's answer.
Be specific, honest, and constructive. Do not use em-dashes.
Return only valid JSON.`;

// POST /api/study/[id]/questions/[qid]/answer
// Body: { answerText: string, status: "got_it" | "struggled" }
// Returns: { attempt: QuestionAttempt }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  try {
    const { id: guideId, qid } = await params;
    const { answerText, status } = await req.json() as {
      answerText: string;
      status: "got_it" | "struggled";
    };

    if (!answerText?.trim()) {
      return Response.json({ error: "Answer text is required." }, { status: 400 });
    }

    const question = await prisma.studyQuestion.findUnique({ where: { id: qid } });
    if (!question) {
      return Response.json({ error: "Question not found." }, { status: 404 });
    }

    const userMessage = `Evaluate this interview answer.

Question: ${question.prompt}
Category: ${question.category}
Difficulty: ${question.difficulty}
Topic: ${question.topic}

Candidate's answer:
${answerText}

Return a JSON object:
{
  "score": number (0-100),
  "summary": string (1-2 sentence overall assessment),
  "strengths": [string] (what they got right, be specific),
  "gaps": [string] (what was missing or incorrect),
  "improvement": string (one concrete thing to focus on next time)
}`;

    const claude = ClaudeClient.getInstance();
    const text = await claude.complete(SYSTEM_PROMPT, userMessage);

    let aiFeedback: string | null = null;
    let score: number | null = null;

    try {
      const parsed = extractJson<{ score?: number }>(text);
      score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : null;
      aiFeedback = JSON.stringify(parsed);
    } catch {
      aiFeedback = text.trim() || null;
    }

    // Save attempt and update question status in a transaction
    const [attempt] = await prisma.$transaction([
      prisma.questionAttempt.create({
        data: { questionId: qid, guideId, answerText, aiFeedback, score, status },
      }),
      prisma.studyQuestion.update({
        where: { id: qid },
        data: {
          status,
          reviewCount: { increment: 1 },
          lastReviewedAt: new Date(),
        },
      }),
    ]);

    return Response.json({ attempt: { ...attempt, aiFeedback: tryParseJson(attempt.aiFeedback) } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit answer";
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET /api/study/[id]/questions/[qid]/answer
// Returns all past attempts for a question, newest first
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  try {
    const { qid } = await params;
    const attempts = await prisma.questionAttempt.findMany({
      where: { questionId: qid },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      attempts: attempts.map((a) => ({ ...a, aiFeedback: tryParseJson(a.aiFeedback) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load attempts";
    return Response.json({ error: message }, { status: 500 });
  }
}
