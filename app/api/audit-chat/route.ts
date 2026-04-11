import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import type Anthropic from "@anthropic-ai/sdk";
import type { AuditResult, ResumeResult } from "../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMsg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are a senior SE/SA career coach helping a software engineer transition to Solutions Engineer / Solutions Architect roles at top-tier tech companies (Amazon, Microsoft, Google, Snowflake, Databricks, Tableau/Salesforce, F5, Expedia, etc.).

You have been given the candidate's full profile audit results. Answer questions concisely and specifically -- give actionable advice, not generic career tips. Reference specific findings from the audit when relevant. Never use em dashes. Be direct and confident.`;

export async function POST(req: NextRequest) {
  try {
    const { message, auditResult, resumeResult, history = [] } = await req.json() as {
      message: string;
      auditResult?: AuditResult;
      resumeResult?: ResumeResult;
      history: ChatMsg[];
    };

    if (!message?.trim()) return Response.json({ error: "No message provided." }, { status: 400 });

    const claude = ClaudeClient.getInstance();

    const contextBlock = [
      auditResult ? [
        "## Profile Audit Results",
        `Overall SA Score: ${auditResult.auditScore}/100`,
        auditResult.linkedinScore != null ? `LinkedIn Score: ${auditResult.linkedinScore}/100` : "",
        auditResult.websiteScore != null ? `Website Score: ${auditResult.websiteScore}/100` : "",
        `Summary: ${auditResult.summary}`,
        "",
        "Signals detected:",
        ...(auditResult.signals ?? []).map(s => `- [${s.severity}/${s.type}] ${s.text}`),
        "",
        "Recommendations:",
        ...(auditResult.recommendations ?? []).map(r => `- [${r.priority}/${r.category}/${r.source ?? "general"}] ${r.title}: ${r.body}`),
        "",
        "Phrases to avoid:",
        ...(auditResult.phrasesToAvoid ?? []).map(p => `- "${p.phrase}" (${p.source ?? ""}/${p.section ?? ""}): ${p.reason}`),
      ].filter(Boolean).join("\n") : "",
      resumeResult ? [
        "",
        "## Resume Analysis",
        `Resume Score: ${resumeResult.score}/100`,
        `Headline: ${resumeResult.headline}`,
        "Weaknesses:",
        ...(resumeResult.weaknesses ?? []).map(w => `- [${w.severity}] ${w.point}: ${w.detail}`),
        "Missing:",
        ...(resumeResult.missing ?? []).map(m => `- ${m.item}: ${m.detail}`),
      ].join("\n") : "",
    ].filter(Boolean).join("\n\n");

    // Build multi-turn messages, injecting context into the first user message
    const messages: Anthropic.MessageParam[] = [];

    if (history.length === 0) {
      messages.push({ role: "user", content: `${contextBlock}\n\n---\n\n${message}` });
    } else {
      const [firstUser, ...rest] = history;
      messages.push({ role: "user", content: `${contextBlock}\n\n---\n\n${firstUser.content}` });
      for (const msg of rest) {
        messages.push({ role: msg.role, content: msg.content });
      }
      messages.push({ role: "user", content: message });
    }

    return sseStream(claude.streamContent(SYSTEM_PROMPT, messages, 1500));
  } catch (err) {
    console.error("[/api/audit-chat]", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
