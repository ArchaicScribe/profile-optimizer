import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { apiError } from "../../../lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export type ResponseType = "accept" | "decline" | "inquire";
export type SourceType = "email" | "linkedin" | "inmail";

const SYSTEM_PROMPT = `You are a professional career assistant helping a job seeker craft recruiter responses.
NEVER use em-dashes (--) or en-dashes. Use commas or separate sentences instead.
Return only the message text, no JSON wrapper, no subject line prefix, no salutation prefix like "Subject:".`;

const TONE_INSTRUCTIONS: Record<ResponseType, string> = {
  accept: "Express genuine interest in learning more. Be warm but measured — not overly enthusiastic. Ask for a brief call.",
  decline: "Politely decline. Be direct but courteous. Give a brief, non-committal reason (not a good fit at this time). Leave the door open for the future.",
  inquire: "Ask clarifying questions before committing. Seek specifics about the role type (direct hire vs contract), company (not a staffing agency), compensation range, and location/remote policy.",
};

const FORMAT_INSTRUCTIONS: Record<SourceType, string> = {
  email: "This is an email reply. Write a proper email body (no 'Subject:' line). Keep it under 180 words. Professional but personable.",
  linkedin: "This is a LinkedIn message reply. Keep it under 100 words — LinkedIn messages should be short and conversational, not formal. No salutation needed.",
  inmail: "This is a LinkedIn InMail reply. Keep it under 150 words. More polished than a regular LinkedIn message but still concise. Start with a brief acknowledgment.",
};

// POST /api/response
// Body: { type, sourceType, jobTitle, company, jdSummary?, liked?, disliked?, notes?, previousMessage? }
// Returns: { message: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      sourceType = "linkedin",
      jobTitle,
      company,
      jdSummary,
      liked,
      disliked,
      notes,
      previousMessage,
    } = body as {
      type: ResponseType;
      sourceType?: SourceType;
      jobTitle: string;
      company: string;
      jdSummary?: string;
      liked?: string;
      disliked?: string;
      notes?: string;
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
      `Format: ${FORMAT_INSTRUCTIONS[sourceType]}`,
      ``,
      `Job title: ${jobTitle}`,
      `Company: ${company}`,
    ];

    if (jdSummary) {
      parts.push(``, `Context from job description: ${jdSummary}`);
    }

    if (previousMessage) {
      const hasAnyFeedback = liked || disliked || notes;
      parts.push(
        ``,
        `A previous draft exists. The user wants a revised version.`,
        ``,
        `Previous draft:`,
        previousMessage,
      );

      if (hasAnyFeedback) {
        parts.push(``, `User feedback:`);
        if (liked) parts.push(`- Keep / what works: ${liked}`);
        if (disliked) parts.push(`- Change / what doesn't work: ${disliked}`);
        if (notes) parts.push(`- Other editorial notes: ${notes}`);
      }

      parts.push(``, `Generate an improved version that incorporates this feedback.`);
    }

    const userMessage = parts.join("\n");
    const message = await claude.complete(SYSTEM_PROMPT, userMessage);
    return Response.json({ message: message.trim() });
  } catch (err) {
    return apiError(err, "Failed to generate response");
  }
}
