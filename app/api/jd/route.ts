import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { extractJson } from "../../../lib/extractJson";
import type { ScanPreferences } from "../../../domain/entities/JobMatch";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a career strategist helping a job seeker evaluate job descriptions.
Analyze the job description against the candidate's preferences and profile goals.
Return a structured JSON analysis with no prose outside the JSON.`;

// POST /api/jd
// Body: { jd: string, preferences: ScanPreferences, goals?: string }
// Returns: { analysis: JDAnalysis }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jd, preferences, goals } = body as {
      jd: string;
      preferences: ScanPreferences;
      goals?: string;
    };

    if (!jd || jd.trim().length < 20) {
      return Response.json({ error: "Please provide a job description." }, { status: 400 });
    }

    const userMessage = `Analyze this job description against the candidate's preferences.

## Candidate Preferences
- Target locations: ${preferences.locations.join(", ")}
- Excluded locations: ${preferences.excludeLocations.join(", ")}
- Role keywords: ${preferences.roleKeywords.join(", ")}
- Excluded keywords: ${preferences.excludeKeywords.join(", ")}
- Direct hire only: ${preferences.directHireOnly ? "Yes" : "No"}
${goals ? `- Additional goals: ${goals}` : ""}

## Job Description
${jd}

Return a JSON object with this exact shape:
{
  "overallFit": "strong" | "moderate" | "poor",
  "fitScore": number (0-100),
  "summary": string (2-3 sentences),
  "matches": [{ "label": string, "detail": string }],
  "concerns": [{ "label": string, "detail": string }],
  "redFlags": [{ "label": string, "detail": string }],
  "isContract": boolean,
  "isStaffingAgency": boolean,
  "locationMatch": boolean,
  "recommendation": "accept" | "inquire" | "decline"
}`;

    const claude = ClaudeClient.getInstance();

    let accumulated = "";
    for await (const chunk of claude.streamText(SYSTEM_PROMPT, userMessage)) {
      accumulated += chunk;
    }

    return Response.json({ analysis: extractJson(accumulated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
