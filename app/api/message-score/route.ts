import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { apiError } from "../../../lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a brutally honest career advisor screening recruiter messages for a senior software engineer targeting SE/SA/CA roles at top-tier tech companies. Evaluate the recruiter message for fit against the candidate's profile and goals.

Rules:
- Flag ANY contract, C2C, corp-to-corp, staffing agency language
- Flag government, federal, DoD, clearance work
- Flag location requirements that conflict with Seattle area or remote preference
- A simple message with no JD should still be scored on what can be inferred (seniority signals, company type, role type, red flag language)
- Do not use em-dashes. Return valid JSON only.`;

// POST /api/message-score
// Body: { message: string }
// Returns: { score: MessageScore }
export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json() as { message: string };

    if (!message?.trim()) {
      return Response.json({ error: "No message provided." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();
    const claude = ClaudeClient.getInstance();

    const userMessage = `Score this recruiter message against the candidate's profile and goals.

${goalsContext}

## Recruiter Message
${message}

Return JSON with this exact structure:
{
  "score": number (0-100, overall opportunity score),
  "verdict": string (1 punchy sentence: what is this actually?),
  "roleAlignment": "strong" | "moderate" | "weak",
  "isContract": boolean,
  "isStaffingAgency": boolean,
  "locationMatch": boolean,
  "signals": [string] (positive signals — what makes this worth considering),
  "redFlags": [string] (negative signals — contract language, staffing agency markers, vague role, wrong location, etc.),
  "recommendation": "respond" | "inquire" | "pass",
  "recommendationReason": string (1-2 sentences: why this recommendation)
}

Scoring guidance:
- 0-39: Pass. Contract, staffing agency, government, wrong location, or totally off-base role
- 40-64: Inquire. Plausible but vague, questionable company, or minor misalignments
- 65-84: Respond. Looks legitimate, good alignment, worth engaging
- 85-100: Strong respond. Clear role match, right company type, right location
- "pass" if isContract, isStaffingAgency, or obvious government/clearance work
- "inquire" if score 40-64 or locationMatch is false
- "respond" if score >= 65 and no hard disqualifiers`;

    const score = await claude.completeJson(SYSTEM_PROMPT, userMessage);
    return Response.json({ score });
  } catch (err) {
    return apiError(err, "Message scoring failed");
  }
}
