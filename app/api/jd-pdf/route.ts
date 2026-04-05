import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { pdfContentBlock } from "../../../lib/pdfToBase64";
import { extractJson } from "../../../lib/extractJson";

export const runtime = "nodejs";
export const maxDuration = 90;

// POST /api/jd-pdf
// Accepts multipart form data with: file (JD PDF, required)
// Returns: { analysis: JDAnalysis }
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file || !file.name.endsWith(".pdf")) {
      return Response.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const config = await getUserConfig();
    const goalsContext = buildGoalsContext(config);

    const systemPrompt = `You are a brutally honest career advisor helping a software engineer transition into SE/SA/CA/CE roles at top-tier tech companies. You review job descriptions and give a clear verdict on fit, flags, and recommended action.

${goalsContext}

Rules:
- Flag ANY contract, C2C, corp-to-corp, 1099, staffing agency, or recruiting firm language as a red flag - these are hard passes
- Flag government, federal, DoD, clearance, or agency work as red flags
- Flag location requirements that conflict with Seattle/remote preference
- Be specific about which SE/SA/CA skills match vs are missing
- Score honestly - a 90 means genuinely strong fit for this person's stated goals
- Do not use em-dashes. Return valid JSON only.`;

    const userMessage = `Analyze this job description PDF against the candidate's profile, goals, and hard preferences.

Return JSON with this exact structure:
{
  "overallFit": "strong" | "moderate" | "poor",
  "fitScore": number (0-100),
  "roleVerdict": string (1-sentence: is this actually an SE/SA/CA role or mislabeled?),
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

    let accumulated = "";
    for await (const chunk of claude.streamContent(
      systemPrompt,
      [{ role: "user", content: [await pdfContentBlock(file), { type: "text", text: userMessage }] as never }],
      2048,
    )) {
      accumulated += chunk;
    }

    return Response.json({ analysis: extractJson(accumulated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "JD PDF analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
