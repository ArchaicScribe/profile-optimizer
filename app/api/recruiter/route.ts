import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { pdfContentBlock } from "../../../lib/pdfToBase64";
import { sseStream } from "../../../lib/sseStream";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/recruiter
// Accepts multipart form data with:
//   - message: Recruiter message text (required)
//   - file:    Resume PDF (optional)
// Returns: text/event-stream — streaming JSON analysis
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get("message") as string | null;
    const file = formData.get("file") as File | null;

    if (!message || !message.trim()) {
      return Response.json({ error: "Recruiter message is required." }, { status: 400 });
    }

    const config = await getUserConfig();
    const goalsContext = buildGoalsContext(config);
    const hasResume = file && file.name.endsWith(".pdf");

    const systemPrompt = `You are a career advisor helping Alex Rauenzahn evaluate recruiter outreach. Alex is a Senior Software Engineer targeting Solutions Engineer, Solutions Architect, Customer Engineer, and Customer Architect roles at Seattle-area tech companies.

${goalsContext}

HARD DISQUALIFIERS — immediately flag and recommend decline if any are present:
- Contract, contract-to-hire, or staff augmentation roles
- Staffing agencies or third-party recruiters placing contractors
- Federal, government, military, or security clearance work
- Roles outside Seattle metro (or fully remote with headquarters outside tech hubs)
- Roles unrelated to SE/SA/CA/CE (pure SWE, devops-only, QA-only, etc.)

Analyze the recruiter message${hasResume ? " and resume" : ""} and return a fit assessment.

Return valid JSON only:
{
  "overallFit": "strong" | "moderate" | "poor",
  "fitScore": number (0-100),
  "roleVerdict": string (1 sentence: what kind of role this is and whether it fits),
  "summary": string (2-3 sentences: what this role is, who it's from, and whether it's worth pursuing),
  "matches": [{ "label": string, "detail": string }],
  "concerns": [{ "label": string, "detail": string }],
  "redFlags": [{ "label": string, "detail": string }],
  "isContract": boolean,
  "isStaffingAgency": boolean,
  "hasGovernmentWork": boolean,
  "locationMatch": boolean,
  "recommendation": "apply" | "inquire" | "decline",
  "recommendationReason": string (1-2 sentences explaining the recommendation),
  "missingFromProfile": [string] (things the recruiter mentioned that Alex should add to his profile),
  "suggestedQuestions": [string] (3-5 questions Alex should ask if he responds)
}`;

    const contentBlocks: object[] = [];

    if (hasResume) {
      contentBlocks.push(await pdfContentBlock(file));
    }

    contentBlocks.push({
      type: "text",
      text: `RECRUITER MESSAGE:\n\n${message.trim()}\n\n${hasResume ? "The resume is provided above. Use it to assess fit gaps and personalize the analysis." : "No resume provided."}\n\nReturn JSON only.`,
    });

    const claude = ClaudeClient.getInstance();
    return sseStream(
      claude.streamContent(
        systemPrompt,
        [{ role: "user", content: contentBlocks as never }],
        2048,
      ),
    );
  } catch (e) {
    console.error("[/api/recruiter] outer catch:", e);
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }
}
