import { ClaudeClient } from "../ClaudeClient";
import { getGoalsContext } from "../../db/getUserConfig";
import { pdfContentBlock } from "../../../lib/pdfToBase64";
import type { ResumeResult } from "../../../lib/types";
import { extractJson } from "../../../lib/extractJson";

const SYSTEM_PROMPT_BASE = `You are a brutally honest career coach and hiring manager who has worked at Amazon, Microsoft, and Snowflake in Solutions Engineering and Solutions Architecture leadership, with deep knowledge of Seattle-area tech hiring.

Your job is to evaluate a resume for customer-facing technical roles: Solutions Engineer (SE), Solutions Architect (SA), Customer Engineer (CE), Customer Architect (CA). Be specific, direct, and actionable.

Return valid JSON only:
{
  "score": number (0-100),
  "headline": string (1-sentence verdict),
  "strengths": [{ "point": string, "detail": string }],
  "weaknesses": [{ "point": string, "detail": string, "severity": "high" | "medium" | "low" }],
  "rewrites": [{ "original": string, "rewritten": string, "reason": string }],
  "missing": [{ "item": string, "detail": string }],
  "redFlags": [{ "flag": string, "detail": string }],
  "nextSteps": [string],
  "jdComparison": {
    "fitScore": number,
    "verdict": string,
    "matched": [string],
    "gaps": [string],
    "tailoringTips": [string]
  }
}`;

export class ResumeComparatorAgent {
  private claude = ClaudeClient.getInstance();

  async compare(resumeFile: File, jdFile?: File, jdText?: string): Promise<AsyncIterable<string>> {
    const { config, goalsContext } = await getGoalsContext();
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${goalsContext}`;

    const hasJD = (jdFile && jdFile.name.endsWith(".pdf")) || (jdText && jdText.trim().length > 0);
    const contentBlocks: object[] = [await pdfContentBlock(resumeFile)];

    if (jdFile?.name.endsWith(".pdf")) {
      contentBlocks.push(await pdfContentBlock(jdFile));
    } else if (jdText?.trim()) {
      contentBlocks.push({ type: "text", text: `JOB DESCRIPTION:\n\n${jdText.trim()}` });
    }

    contentBlocks.push({
      type: "text",
      text: hasJD
        ? `Analyze the resume for SE/SA/CA positioning at: ${config.targetCompanies.join(", ")}, and compare it against the job description. Return JSON only.`
        : `Analyze this resume for SE/SA/CA positioning at: ${config.targetCompanies.join(", ")}. Return JSON only.`,
    });

    return this.claude.streamContent(
      systemPrompt,
      [{ role: "user", content: contentBlocks as never }],
      4096,
    );
  }

  async compareSync(resumeFile: File, jdFile?: File, jdText?: string): Promise<ResumeResult> {
    const { config, goalsContext } = await getGoalsContext();
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${goalsContext}`;

    const contentBlocks: object[] = [await pdfContentBlock(resumeFile)];

    if (jdFile?.name.endsWith(".pdf")) {
      contentBlocks.push(await pdfContentBlock(jdFile));
    } else if (jdText?.trim()) {
      contentBlocks.push({ type: "text", text: `JOB DESCRIPTION:\n\n${jdText.trim()}` });
    }

    contentBlocks.push({
      type: "text",
      text: `Analyze this resume for SE/SA/CA positioning at: ${config.targetCompanies.join(", ")}. Return JSON only.`,
    });

    const text = await this.claude.completeContent(systemPrompt, [
      { role: "user", content: contentBlocks as never },
    ]);

    return extractJson<ResumeResult>(text);
  }
}
