import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a professional communication coach helping a senior SE/SA (Solutions Engineer / Solutions Architect) candidate navigate recruiter outreach. You have the recruiter message context and the candidate's drafted response.

Your job is to answer questions like:
- "Should I add more context?" / "Is this too long / too short?"
- "Is this appropriate to say?" / "Does this sound too eager / too cold?"
- "Should I mention salary?" / "Is asking about remote okay here?"
- "What should I watch out for with this company / role?"
- "How do I ask about X without sounding Y?"

Be direct, specific, and opinionated. Give a clear yes/no or recommendation before any explanation. Never use em dashes. Keep responses concise — a sentence or two when possible, more only if the question warrants it.`;

// POST /api/recruiter-chat
// Body: { message, context, responseType, draftMessage, history }
// Returns: text/event-stream
export async function POST(req: NextRequest) {
  try {
    const { message, context, responseType, draftMessage, history = [] } = await req.json() as {
      message: string;
      context?: string;
      responseType?: string;
      draftMessage?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!message?.trim()) {
      return Response.json({ error: "Missing message." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();
    const claude = ClaudeClient.getInstance();

    const contextBlock = [
      "## Candidate Context",
      goalsContext,
      "",
      context ? `## Recruiter / JD Context\n${context}` : "",
      responseType ? `## Response Type\nThe candidate is drafting a "${responseType}" response.` : "",
      draftMessage ? `## Current Draft Response\n${draftMessage}` : "",
      "",
      "---",
      "The candidate now has a question about this situation.",
    ].filter(Boolean).join("\n");

    const messages: Anthropic.MessageParam[] = [];

    if (history.length === 0) {
      messages.push({ role: "user", content: `${contextBlock}\n\n${message}` });
    } else {
      const [firstUser, ...rest] = history;
      messages.push({ role: "user", content: `${contextBlock}\n\n${firstUser.content}` });
      for (const msg of rest) {
        messages.push({ role: msg.role, content: msg.content });
      }
      messages.push({ role: "user", content: message });
    }

    return sseStream(claude.streamContent(SYSTEM_PROMPT, messages, 1024));
  } catch (err) {
    console.error("[/api/recruiter-chat]", err);
    const msg = err instanceof Error ? err.message : "Chat failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
