import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { sseStream } from "../../../lib/sseStream";
import { buildMessages } from "../../../lib/buildMessages";
import { apiError } from "../../../lib/utils";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import type { AuditResult, ChatMessage, ResumeResult } from "../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior SE/SA career coach helping a software engineer transition to Solutions Engineer / Solutions Architect roles at top-tier tech companies (Amazon, Microsoft, Google, Snowflake, Databricks, Tableau/Salesforce, F5, Expedia, etc.).

You have been given the candidate's full profile audit results and goals. Answer questions concisely and specifically — give actionable advice, not generic career tips. Reference specific findings from the audit when relevant. Never use em dashes. Be direct and confident.`;

export async function POST(req: NextRequest) {
  try {
    const { message, auditResult, resumeResult, history = [] } = await req.json() as {
      message: string;
      auditResult?: AuditResult;
      resumeResult?: ResumeResult;
      history: ChatMessage[];
    };

    if (!message?.trim()) return Response.json({ error: "No message provided." }, { status: 400 });

    const { goalsContext } = await getGoalsContext();
    const claude = ClaudeClient.getInstance();

    const sections: string[] = ["## Candidate Goals & Context", goalsContext];

    if (auditResult) {
      sections.push(
        "\n## Profile Audit Results",
        `Overall SA Score: ${auditResult.auditScore}/100`,
        ...(auditResult.linkedinScore != null ? [`LinkedIn Score: ${auditResult.linkedinScore}/100`] : []),
        ...(auditResult.websiteScore != null ? [`Website Score: ${auditResult.websiteScore}/100`] : []),
        `Summary: ${auditResult.summary}`,
        "",
        "Signals:",
        ...(auditResult.signals ?? []).map(s => `- [${s.severity}/${s.type}] ${s.text}`),
        "",
        "Recommendations:",
        ...(auditResult.recommendations ?? []).map(r => `- [${r.priority}/${r.category}/${r.source ?? "general"}] ${r.title}: ${r.body}`),
        "",
        "Phrases to avoid:",
        ...(auditResult.phrasesToAvoid ?? []).map(p => `- "${p.phrase}" (${p.source ?? ""}/${p.section ?? ""}): ${p.reason}`),
      );
    }

    if (resumeResult) {
      sections.push(
        "\n## Resume Analysis",
        `Resume Score: ${resumeResult.score}/100`,
        `Headline: ${resumeResult.headline}`,
        "Weaknesses:",
        ...(resumeResult.weaknesses ?? []).map(w => `- [${w.severity}] ${w.point}: ${w.detail}`),
        "Missing:",
        ...(resumeResult.missing ?? []).map(m => `- ${m.item}: ${m.detail}`),
      );
    }

    const messages = buildMessages(sections.join("\n"), message, history);
    return sseStream(claude.streamContent(SYSTEM_PROMPT, messages, 1500));
  } catch (err) {
    return apiError(err, "Chat failed");
  }
}
