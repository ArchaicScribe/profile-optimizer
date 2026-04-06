import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { sseStream } from "../../../lib/sseStream";

export const runtime = "nodejs";
export const maxDuration = 90;

// POST /api/rewrite
// Body: { headline: string, summary: string }
// Returns: text/event-stream — streaming SE/SA-optimized LinkedIn headline and summary variants
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headline, summary } = body as { headline?: string; summary?: string };

    if (!headline || !summary) {
      return Response.json(
        { error: "Both headline and summary are required." },
        { status: 400 },
      );
    }

    const { goalsContext } = await getGoalsContext();

    const systemPrompt = `You are a LinkedIn copywriter specializing in positioning software engineers for Solutions Engineer, Solutions Architect, Customer Engineer, and Customer Architect roles at top-tier tech companies.

${goalsContext}

You write with clarity and specificity. No buzzwords, no empty phrases like "passionate about" or "results-driven". Headlines must read as a trusted technical advisor, not an implementer. Summaries must open with what you do for customers, not where you've worked.

Do not use em-dashes. Return valid JSON only.`;

    const userMessage = `Rewrite this LinkedIn profile for SE/SA/CA/CE positioning at top-tier tech companies (Amazon, Microsoft, Google, Snowflake, Databricks, Salesforce and similar).

Current headline: ${headline}
Current about/summary: ${summary}

Return JSON with this exact structure:
{
  "headlines": [
    {
      "text": string (max 220 chars, no em-dashes),
      "rationale": string (1-2 sentences: what signal this adds),
      "signals": [string] (2-3 specific SE/SA signals this headline adds)
    }
  ],
  "summaries": [
    {
      "text": string (full rewritten About section, 3-5 paragraphs),
      "rationale": string (1-2 sentences: the strategic angle this takes),
      "keyChanges": [string] (3-5 specific changes made and why)
    }
  ]
}

Requirements:
- 3 headline variants: one direct/title-focused, one value-prop focused, one domain-expertise focused
- 3 summary variants: one enterprise-architecture angle, one customer-advisor angle, one cloud/platform specialist angle
- Headlines: specific, no filler words, include relevant keywords SE/SA hiring managers search for
- Summaries: open with customer or business value, weave in AWS/Azure depth, show advisory mindset not implementer mindset
- No government, federal, contractor, or staffing agency language
- Write as if this person already has an SE/SA/CA title, not as if they are transitioning`;

    const claude = ClaudeClient.getInstance();
    return sseStream(claude.streamText(systemPrompt, userMessage));
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
