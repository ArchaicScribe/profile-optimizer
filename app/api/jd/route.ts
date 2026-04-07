import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { extractJson } from "../../../lib/extractJson";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a brutally honest career advisor helping a software engineer transition into SE/SA/CA/CE roles at top-tier tech companies. You review job descriptions and give a clear verdict on fit, flags, and recommended action.

Rules:
- Flag ANY contract, C2C, corp-to-corp, staffing agency language as a red flag
- Flag government, federal, DoD, clearance work as red flags
- Flag location requirements that conflict with Seattle/remote preference
- Do not use em-dashes. Return valid JSON only.`;

// POST /api/jd
// Body: { jd: string, preferences?: object, goals?: string }
// Returns: { analysis: JDAnalysis }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jd, goals } = body as {
      jd: string;
      preferences?: object;
      goals?: string;
    };

    if (!jd || jd.trim().length < 20) {
      return Response.json({ error: "Please provide a job description." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();

    const userMessage = `Analyze this job description against the candidate's profile, goals, and hard preferences.

${goalsContext}
${goals ? `\nAdditional context: ${goals}` : ""}

## Job Description
${jd}

Return JSON with this exact structure:
{
  "overallFit": "strong" | "moderate" | "poor",
  "fitScore": number (0-100),
  "roleVerdict": string (1-sentence: is this actually an SE/SA/CA role?),
  "summary": string (2-3 sentences: overall assessment),
  "isContract": boolean,
  "isStaffingAgency": boolean,
  "hasGovernmentWork": boolean,
  "locationMatch": boolean,
  "recommendation": "apply" | "inquire" | "decline",
  "recommendationReason": string (1-2 sentences),
  "matches": [{ "label": string, "detail": string }],
  "concerns": [{ "label": string, "detail": string }],
  "redFlags": [{ "label": string, "detail": string }],
  "missingFromProfile": [string],
  "suggestedQuestions": [string]
}

Hard rules for recommendation:
- "decline" if isContract, isStaffingAgency, hasGovernmentWork, or fitScore < 40
- "inquire" if fitScore 40-64 or locationMatch is false
- "apply" only if fitScore >= 65 and no hard disqualifiers`;

    const claude = ClaudeClient.getInstance();

    const text = await claude.complete(SYSTEM_PROMPT, userMessage);
    return Response.json({ analysis: extractJson(text) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
