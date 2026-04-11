import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert LinkedIn profile writer specializing in SE/SA (Solutions Engineer, Solutions Architect, Customer Engineer, Customer Architect) positioning for senior technical professionals targeting roles at top-tier cloud-native technology companies — particularly in the Seattle area (Amazon, Microsoft, Google, Snowflake, Databricks, Tableau/Salesforce, Expedia, F5, Zillow, T-Mobile).

You will receive:
1. A specific audit recommendation describing what is wrong and why
2. The candidate's current text for that section

Rewrite the provided text to directly address the recommendation. Do not fabricate experience that wasn't implied in the original. Preserve authentic details but reframe them with SE/SA advisory language — move from "I built" to "I designed/advised/architected." Use active, confident framing. Never use em dashes.

Format your response exactly as follows — use these exact section headers with no markdown bold markers:

REWRITTEN:
[the rewritten text — clean and ready to paste into LinkedIn with no additional commentary]

CHANGES:
- [key change 1]
- [key change 2]
- [key change 3 if needed]`;

// POST /api/audit-rewrite
// Body: { recommendation: { title, body, priority, category }, currentText: string }
// Returns: text/event-stream — streaming rewrite
export async function POST(req: NextRequest) {
  try {
    const { recommendation, currentText } = await req.json() as {
      recommendation: { title: string; body: string; priority: string; category: string };
      currentText: string;
    };

    if (!recommendation?.title || !currentText?.trim()) {
      return Response.json({ error: "Missing recommendation or current text." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();
    const claude = ClaudeClient.getInstance();

    const userMessage = [
      `## Audit Recommendation`,
      `**Issue:** ${recommendation.title}`,
      `**Category:** ${recommendation.category} | **Priority:** ${recommendation.priority}`,
      ``,
      `**Detail:** ${recommendation.body}`,
      ``,
      `## Candidate Context`,
      goalsContext,
      ``,
      `## Current Text to Rewrite`,
      currentText.trim(),
      ``,
      `Rewrite the current text above to directly address this recommendation.`,
    ].join("\n");

    return sseStream(claude.streamText(SYSTEM_PROMPT, userMessage, 2048));
  } catch (err) {
    console.error("[/api/audit-rewrite]", err);
    const message = err instanceof Error ? err.message : "Rewrite failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
