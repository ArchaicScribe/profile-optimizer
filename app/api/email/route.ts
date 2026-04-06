import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { pdfContentBlock } from "../../../lib/pdfToBase64";

export const runtime = "nodejs";
export const maxDuration = 30;

export type EmailType = "cold_outreach" | "application" | "follow_up" | "networking";

const TYPE_INSTRUCTIONS: Record<EmailType, string> = {
  cold_outreach:
    "Write a concise cold outreach email to a recruiter or hiring manager. Express genuine interest in the company, briefly highlight relevant background, and ask for a conversation. Keep it under 150 words.",
  application:
    "Write a professional application email to accompany a resume submission. Highlight the strongest fit points against the role and close with a call to action. Keep it under 200 words.",
  follow_up:
    "Write a polite follow-up email after submitting an application or having an interview. Reference the prior interaction, reaffirm interest, and ask for an update. Keep it under 120 words.",
  networking:
    "Write a professional networking email to someone at the target company. Be warm but not sycophantic, find common ground, and make a clear but low-pressure ask. Keep it under 150 words.",
};

const SYSTEM_PROMPT = `You are a professional career assistant helping a senior software engineer craft outreach emails for job applications.

Style rules:
- Never use em-dashes or en-dashes — use commas or separate sentences
- No hollow filler phrases ("I hope this finds you well", "I am excited to", "I wanted to reach out")
- Be direct, confident, and human
- No subject line prefix label; include the subject line on the first line as: Subject: ...
- Then a blank line, then the email body
- End with: Best, Alex`;

// POST /api/email
// Body: FormData with:
//   type:     EmailType (required)
//   company:  string (required)
//   role:     string (required)
//   jd:       string (optional — pasted JD text)
//   jdFile:   File (optional — JD PDF)
//   resumeFile: File (optional — resume PDF)
//   feedback: string (optional — revision feedback)
//   previous: string (optional — previous draft to revise)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const type = (form.get("type") as EmailType | null) ?? "application";
    const company = (form.get("company") as string | null)?.trim() ?? "";
    const role = (form.get("role") as string | null)?.trim() ?? "";
    const jdText = (form.get("jd") as string | null)?.trim() ?? "";
    const jdFile = form.get("jdFile") as File | null;
    const resumeFile = form.get("resumeFile") as File | null;
    const feedback = (form.get("feedback") as string | null)?.trim() ?? "";
    const previous = (form.get("previous") as string | null)?.trim() ?? "";

    if (!company || !role) {
      return Response.json({ error: "Company and role are required." }, { status: 400 });
    }

    const { goalsContext } = await getGoalsContext();

    const systemWithGoals = `${SYSTEM_PROMPT}\n\n${goalsContext}`;

    const contentBlocks: object[] = [];

    if (jdFile && jdFile.name.endsWith(".pdf")) {
      contentBlocks.push(await pdfContentBlock(jdFile));
    }
    if (resumeFile && resumeFile.name.endsWith(".pdf")) {
      contentBlocks.push(await pdfContentBlock(resumeFile));
    }

    const parts = [
      `Generate a ${type.replace("_", " ")} email for the following situation.`,
      ``,
      `Instructions: ${TYPE_INSTRUCTIONS[type]}`,
      ``,
      `Company: ${company}`,
      `Role: ${role}`,
    ];

    if (jdText) {
      parts.push(``, `Job Description:`, jdText);
    } else if (jdFile) {
      parts.push(``, `(Job description PDF is attached above.)`);
    }

    if (resumeFile) {
      parts.push(``, `(Resume PDF is attached above.)`);
    }

    if (previous && feedback) {
      parts.push(
        ``,
        `A previous draft exists. The user was not satisfied with it.`,
        `Previous draft:`,
        previous,
        ``,
        `User feedback: ${feedback}`,
        ``,
        `Generate an improved version addressing the feedback.`,
      );
    }

    contentBlocks.push({ type: "text", text: parts.join("\n") });

    const claude = ClaudeClient.getInstance();
    const text = await claude.completeContent(systemWithGoals, [
      { role: "user", content: contentBlocks as never },
    ]);

    return Response.json({ email: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate email";
    return Response.json({ error: message }, { status: 500 });
  }
}
