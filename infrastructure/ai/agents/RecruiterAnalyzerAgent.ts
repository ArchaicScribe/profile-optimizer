import { ClaudeClient } from "../ClaudeClient";
import { getGoalsContext } from "../../db/getUserConfig";
import { pdfContentBlock } from "../../../lib/pdfToBase64";
import type { JDAnalysis } from "../../../lib/types";
import { extractJson } from "../../../lib/extractJson";

const SYSTEM_PROMPT_BASE = `You are a career advisor helping Alex Rauenzahn evaluate recruiter outreach. Alex is a Senior Software Engineer targeting Solutions Engineer, Solutions Architect, Customer Engineer, and Customer Architect roles at Seattle-area tech companies.

HARD DISQUALIFIERS — immediately flag and recommend decline if any are present:
- Contract, contract-to-hire, or staff augmentation roles
- Staffing agencies or third-party recruiters placing contractors
- Federal, government, military, or security clearance work
- Roles outside Seattle metro (or fully remote with headquarters outside tech hubs)
- Roles unrelated to SE/SA/CA/CE (pure SWE, devops-only, QA-only, etc.)

Return valid JSON only matching this schema:
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
  "recommendationReason": string,
  "missingFromProfile": [string],
  "suggestedQuestions": [string]
}`;

export class RecruiterAnalyzerAgent {
  private claude = ClaudeClient.getInstance();

  async analyze(
    message: string,
    resumeFile?: File,
  ): Promise<AsyncIterable<string>> {
    const { goalsContext } = await getGoalsContext();
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${goalsContext}`;

    const contentBlocks: object[] = [];

    if (resumeFile?.name.endsWith(".pdf")) {
      contentBlocks.push(await pdfContentBlock(resumeFile));
    }

    contentBlocks.push({
      type: "text",
      text: `RECRUITER MESSAGE:\n\n${message.trim()}\n\n${
        resumeFile ? "The resume is attached above. Use it to assess fit gaps." : "No resume provided."
      }\n\nReturn JSON only.`,
    });

    return this.claude.streamContent(
      systemPrompt,
      [{ role: "user", content: contentBlocks as never }],
      2048,
    );
  }

  async analyzeSync(message: string, resumeFile?: File): Promise<JDAnalysis> {
    const { goalsContext } = await getGoalsContext();
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${goalsContext}`;

    const contentBlocks: object[] = [];

    if (resumeFile?.name.endsWith(".pdf")) {
      contentBlocks.push(await pdfContentBlock(resumeFile));
    }

    contentBlocks.push({
      type: "text",
      text: `RECRUITER MESSAGE:\n\n${message.trim()}\n\nReturn JSON only.`,
    });

    const text = await this.claude.completeContent(systemPrompt, [
      { role: "user", content: contentBlocks as never },
    ]);

    return extractJson<JDAnalysis>(text);
  }
}
