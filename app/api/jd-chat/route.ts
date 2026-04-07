import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import type { JDAnalysis } from "../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/jd-chat
// Body: { question, analysis, jdText?, history? }
// Returns: text/event-stream
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      question: string;
      analysis: JDAnalysis;
      jdText?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    const { question, analysis, jdText, history = [] } = body;

    if (!question?.trim()) {
      return Response.json({ error: "Question is required." }, { status: 400 });
    }

    const systemPrompt = `You are a career advisor who just analyzed a job description for Alex Rauenzahn, a Senior Software Engineer targeting Solutions Engineer, Solutions Architect, Customer Engineer, and Customer Architect roles at top-tier Seattle-area tech companies.

You produced the following analysis of the job description:

ANALYSIS RESULT:
- Overall fit: ${analysis.overallFit} (score: ${analysis.fitScore}/100)
- Role verdict: ${analysis.roleVerdict ?? "N/A"}
- Summary: ${analysis.summary}
- Recommendation: ${analysis.recommendation}
- Recommendation reason: ${analysis.recommendationReason ?? "N/A"}
- Is contract: ${analysis.isContract}
- Is staffing agency: ${analysis.isStaffingAgency}
- Has government work: ${analysis.hasGovernmentWork ?? false}
- Location match: ${analysis.locationMatch}
${analysis.matches?.length ? `- Matches: ${analysis.matches.map(m => `${m.label}: ${m.detail}`).join("; ")}` : ""}
${analysis.concerns?.length ? `- Concerns: ${analysis.concerns.map(c => `${c.label}: ${c.detail}`).join("; ")}` : ""}
${analysis.redFlags?.length ? `- Red flags: ${analysis.redFlags.map(r => `${r.label}: ${r.detail}`).join("; ")}` : ""}
${analysis.missingFromProfile?.length ? `- Missing from profile: ${analysis.missingFromProfile.join(", ")}` : ""}
${jdText ? `\nORIGINAL JOB DESCRIPTION:\n${jdText.slice(0, 3000)}` : ""}

Answer the user's follow-up questions about this analysis. Be direct and specific — quote exact language from the JD when explaining why you flagged something. If you flagged something as a red flag, explain precisely what language or signals triggered it. Do not use em-dashes.`;

    const claude = ClaudeClient.getInstance();

    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...history,
      { role: "user", content: question.trim() },
    ];

    return sseStream(
      claude.streamContent(systemPrompt, messages, 1024),
    );
  } catch (err) {
    console.error("[/api/jd-chat]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 },
    );
  }
}
