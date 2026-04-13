import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import { buildMessages } from "../../../lib/buildMessages";
import { apiError } from "../../../lib/utils";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import type { ChatMessage } from "../../../lib/types";
import type { ResponseType } from "../response/route";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a professional communication coach helping a senior SE/SA candidate navigate recruiter outreach. You have the recruiter message context and the candidate's drafted response.

Be direct, specific, and opinionated. Give a clear yes/no or recommendation before any explanation. Never use em dashes. Keep responses concise — a sentence or two when possible, more only if the question warrants it.`;

export async function POST(req: NextRequest) {
  try {
    const { message, context, responseType, draftMessage, history = [] } = await req.json() as {
      message: string;
      context?: string;
      responseType?: ResponseType;
      draftMessage?: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return Response.json({ error: "Missing message." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();
    const claude = ClaudeClient.getInstance();

    const contextBlock = [
      "## Candidate Context",
      goalsContext,
      context ? `\n## Recruiter / JD Context\n${context}` : "",
      responseType ? `\n## Response Type\nThe candidate is drafting a "${responseType}" response.` : "",
      draftMessage ? `\n## Current Draft Response\n${draftMessage}` : "",
    ].filter(Boolean).join("\n");

    const messages = buildMessages(contextBlock, message, history ?? [], "\n\n");

    return sseStream(claude.streamContent(SYSTEM_PROMPT, messages, 1024));
  } catch (err) {
    return apiError(err, "Chat failed");
  }
}
