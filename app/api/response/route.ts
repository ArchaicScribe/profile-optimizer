import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";

export const runtime = "nodejs";
export const maxDuration = 30;

export type ResponseType = "accept" | "decline" | "inquire";

const SYSTEM_PROMPT = `You are a professional career assistant helping a job seeker craft recruiter responses.
Write concise, professional messages. Keep messages under 150 words.
NEVER use em-dashes (--) or en-dashes. Use commas or separate sentences instead.
Return only the message text, no JSON wrapper, no subject line, no salutation prefix.`;

const TONE_INSTRUCTIONS: Record<ResponseType, string> = {
  accept: "Express genuine interest in learning more. Be warm but measured - not overly enthusiastic. Ask for a brief call.",
  decline: "Politely decline. Be direct but courteous. Give a brief, non-committal reason (not a good fit at this time). Leave the door open for the future.",
  inquire: "Ask clarifying questions before committing. Seek specifics about the role type (direct hire vs contract), company (not a staffing agency), compensation range, and location/remote policy.",
};

// POST /api/response
// Body: { type: ResponseType, jobTitle: string, company: string, jdSummary?: string, feedback?: string, previousMessage?: string }
// Returns: { message: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, jobTitle, company, jdSummary, feedback, previousMessage } = body as {
      type: ResponseType;
      jobTitle: string;
      company: string;
      jdSummary?: string;
      feedback?: string;
      previousMessage?: string;
    };

    if (!type || !jobTitle || !company) {
      return Response.json({ error: "Missing required fields." }, { status: 400 });
    }

    const claude = ClaudeClient.getInstance();

    const parts = [
      `Write a recruiter response for the following situation.`,
      ``,
      `Response type: ${type.toUpperCase()}`,
      `Tone guidance: ${TONE_INSTRUCTIONS[type]}`,
      ``,
      `Job title: ${jobTitle}`,
      `Company: ${company}`,
    ];

    if (jdSummary) {
      parts.push(``, `Context from job description: ${jdSummary}`);
    }

    if (previousMessage && feedback) {
      parts.push(
        ``,
        `A previous draft was generated but the user was not satisfied.`,
        `Previous draft:`,
        previousMessage,
        ``,
        `User feedback on what to change: ${feedback}`,
        ``,
        `Please generate an improved version addressing the feedback.`
      );
    }

    const userMessage = parts.join("\n");

    const message = await claude.complete(SYSTEM_PROMPT, userMessage);
    return Response.json({ message: message.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate response";
    return Response.json({ error: message }, { status: 500 });
  }
}
