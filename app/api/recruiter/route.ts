import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/recruiter
// Accepts multipart form data with:
//   - message: Recruiter message text (required)
//   - file: Resume PDF (optional)
// Returns: text/event-stream - streaming JSON analysis
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
      const resumeBuffer = Buffer.from(await file.arrayBuffer());
      const resumeBase64 = resumeBuffer.toString("base64");
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: resumeBase64 },
      });
    }

    contentBlocks.push({
      type: "text",
      text: `RECRUITER MESSAGE:\n\n${message.trim()}\n\n${hasResume ? "The resume is provided above. Use it to assess fit gaps and personalize the analysis." : "No resume provided."}\n\nReturn JSON only.`,
    });

    const claude = ClaudeClient.getInstance();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = await claude.client.messages.stream({
            model: claude.defaultModel,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: "user", content: contentBlocks as never }],
          });

          for await (const chunk of aiStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Analysis failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
