import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert LinkedIn profile writer and career strategist specializing in SE/SA (Solutions Engineer, Solutions Architect, Customer Engineer, Customer Architect) positioning for senior technical professionals targeting roles at top-tier cloud-native technology companies — particularly in the Seattle area.

You are in a conversation about a specific audit recommendation and a rewrite that was generated. The user may want to:
- Iterate on the rewrite (make it shorter, adjust tone, emphasize different aspects)
- Ask whether specific framing is accurate or appropriate for a target company
- Provide feedback on what they like or dislike
- Ask clarifying questions about the recommendation itself
- Discuss whether their actual experience justifies a particular framing

Be direct, specific, and honest. If the user's actual experience as described doesn't fully support a claim in the rewrite, say so clearly and suggest a more defensible framing. Never use em dashes. Keep responses focused and concise.`;

// POST /api/audit-rewrite-chat
// Body: { message, recommendation, currentText, rewriteOutput?, history? }
// Returns: text/event-stream
export async function POST(req: NextRequest) {
  try {
    const { message, recommendation, currentText, rewriteOutput, history = [] } = await req.json() as {
      message: string;
      recommendation: { title: string; body: string; priority: string; category: string };
      currentText?: string;
      rewriteOutput?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!message?.trim() || !recommendation?.title) {
      return Response.json({ error: "Missing message or recommendation context." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();
    const claude = ClaudeClient.getInstance();

    // Build context block prepended to the first user message
    const contextBlock = [
      `## Context`,
      ``,
      `### Audit Recommendation`,
      `**Issue:** ${recommendation.title}`,
      `**Category:** ${recommendation.category} | **Priority:** ${recommendation.priority}`,
      `**Detail:** ${recommendation.body}`,
      ``,
      `### Candidate Profile Context`,
      goalsContext,
      currentText ? `\n### Original Text\n${currentText}` : "",
      rewriteOutput ? `\n### Generated Rewrite\n${rewriteOutput}` : "",
      ``,
      `---`,
      `The user is now following up with questions or feedback about the above.`,
    ].filter(Boolean).join("\n");

    // Inject context into the first turn of history
    const messages: Anthropic.MessageParam[] = [];

    if (history.length === 0) {
      // First message — prepend context
      messages.push({ role: "user", content: `${contextBlock}\n\n${message}` });
    } else {
      // Subsequent turns — context was already in the first message
      const [firstUser, ...rest] = history;
      messages.push({ role: "user", content: `${contextBlock}\n\n${firstUser.content}` });
      for (const msg of rest) {
        messages.push({ role: msg.role, content: msg.content });
      }
      messages.push({ role: "user", content: message });
    }

    return sseStream(claude.streamContent(SYSTEM_PROMPT, messages, 1024));
  } catch (err) {
    console.error("[/api/audit-rewrite-chat]", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
