import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { pdfContentBlock } from "../../../lib/pdfToBase64";
import { extractJson } from "../../../lib/extractJson";

export const runtime = "nodejs";
export const maxDuration = 90;

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];

function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

/** Extract plain text from a JD file (DOCX/DOC/TXT). */
async function extractDocumentText(file: File): Promise<string> {
  const ext = getExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === ".txt") {
    return buffer.toString("utf-8");
  }

  // .docx or .doc — dynamic import avoids top-level ESM/CJS bundling issues
  const mammoth = await import("mammoth");
  const mod = ("default" in mammoth ? mammoth.default : mammoth) as typeof import("mammoth");
  const result = await mod.extractRawText({ buffer });
  return result.value;
}

// POST /api/jd-pdf
// Accepts multipart form data with: file (JD — PDF, DOCX, DOC, or TXT, required)
// Returns: { analysis: JDAnalysis }
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "A file is required." }, { status: 400 });
    }

    const ext = getExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return Response.json(
        { error: `Unsupported file type "${ext}". Please upload a PDF, DOCX, DOC, or TXT file.` },
        { status: 400 },
      );
    }

    const { goalsContext } = await getGoalsContext();

    const systemPrompt = `You are a brutally honest career advisor helping a software engineer transition into SE/SA/CA/CE roles at top-tier tech companies. You review job descriptions and give a clear verdict on fit, flags, and recommended action.

${goalsContext}

Rules:
- Flag ANY contract, C2C, corp-to-corp, 1099, staffing agency, or recruiting firm language as a red flag - these are hard passes
- Flag government, federal, DoD, clearance, or agency work as red flags
- Flag location requirements that conflict with Seattle/remote preference
- Be specific about which SE/SA/CA skills match vs are missing
- Score honestly - a 90 means genuinely strong fit for this person's stated goals
- Do not use em-dashes. Return valid JSON only.`;

    const jsonSchema = `Return JSON with this exact structure:
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
    let text: string;

    if (ext === ".pdf") {
      // Send PDF natively as a document block — Claude can read it directly
      const userMessage = `Analyze this job description PDF against the candidate's profile, goals, and hard preferences.\n\n${jsonSchema}`;
      text = await claude.completeContent(
        systemPrompt,
        [{ role: "user", content: [await pdfContentBlock(file), { type: "text", text: userMessage }] as never }],
        2048,
      );
    } else {
      // DOCX / DOC / TXT — extract text first, send as plain text
      const docText = await extractDocumentText(file);
      if (!docText.trim()) {
        return Response.json({ error: "Could not extract text from the file. Try pasting the JD as text instead." }, { status: 422 });
      }
      const userMessage = `Analyze this job description against the candidate's profile, goals, and hard preferences.\n\nJOB DESCRIPTION:\n${docText}\n\n${jsonSchema}`;
      text = await claude.complete(systemPrompt, userMessage, 2048);
    }

    return Response.json({ analysis: extractJson(text) });
  } catch (err) {
    console.error("[/api/jd-pdf]", err);
    const message = err instanceof Error ? err.message : "JD analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
