import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import { buildMessages } from "../../../lib/buildMessages";
import { apiError } from "../../../lib/utils";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import type { ChatMessage } from "../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert LinkedIn profile writer and career strategist specializing in SE/SA (Solutions Engineer, Solutions Architect, Customer Engineer, Customer Architect) positioning for senior technical professionals targeting roles at top-tier cloud-native technology companies — particularly in the Seattle area.

You are in a conversation about a specific audit recommendation and a rewrite that was generated. The user may want to iterate on the rewrite, ask whether specific framing is accurate, provide feedback, ask clarifying questions, or discuss whether their actual experience justifies a particular claim.

Be direct, specific, and honest. If the user's experience doesn't fully support a claim in the rewrite, say so and suggest a more defensible framing. Never use em dashes. Keep responses focused and concise.`;

export async function POST(req: NextRequest) {
  try {
    const { message, recommendation, currentText, rewriteOutput, history = [] } = await req.json() as {
      message: string;
      recommendation: { title: string; body: string; priority: string; category: string };
      currentText?: string;
      rewriteOutput?: string;
      history?: ChatMessage[];
    };

    if (!message?.trim() || !recommendation?.title) {
      return Response.json({ error: "Missing message or recommendation context." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();
    const claude = ClaudeClient.getInstance();

    const contextBlock = [
      "## Audit Recommendation",
      `Issue: ${recommendation.title}`,
      `Category: ${recommendation.category} | Priority: ${recommendation.priority}`,
      `Detail: ${recommendation.body}`,
      "",
      "## Candidate Profile Context",
      goalsContext,
      currentText ? `\n## Original Text\n${currentText}` : "",
      rewriteOutput ? `\n## Generated Rewrite\n${rewriteOutput}` : "",
    ].filter(Boolean).join("\n");

    const messages = buildMessages(contextBlock, message, history ?? [], "\n\n");
    return sseStream(claude.streamContent(SYSTEM_PROMPT, messages, 1024));
  } catch (err) {
    return apiError(err, "Chat failed");
  }
}
