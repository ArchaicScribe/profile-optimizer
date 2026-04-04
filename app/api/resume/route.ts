import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 90;

// POST /api/resume
// Accepts multipart form data with:
//   - file: Resume PDF
// Returns: text/event-stream - streaming SE/SA-focused resume analysis
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name.endsWith(".pdf")) {
      return Response.json({ error: "Please upload a PDF resume." }, { status: 400 });
    }

    const config = await getUserConfig();
    const goalsContext = buildGoalsContext(config);

    const systemPrompt = `You are a brutally honest career coach and hiring manager who has worked at Snowflake, Databricks, and Google in Solutions Engineering leadership.

${goalsContext}

Your job is to evaluate this resume specifically for Solutions Engineer (SE) and Solutions Architect (SA) roles at top-tier tech companies. Be specific, direct, and actionable. Do not be encouraging for its own sake.

Analyze:
1. Overall SE/SA positioning score (0-100)
2. What reads well for SE/SA hiring managers at the target companies
3. What actively hurts the candidacy (solo contributor language, implementation-only framing, etc.)
4. Specific bullet rewrites - take the weakest bullets and show exactly how to reframe them for SE/SA
5. What is entirely missing that SE/SA resumes need
6. Red flags a recruiter or hiring manager would flag

Return valid JSON only:
{
  "score": number (0-100, current SE/SA positioning strength),
  "headline": string (1-sentence verdict),
  "strengths": [{ "point": string, "detail": string }],
  "weaknesses": [{ "point": string, "detail": string, "severity": "high" | "medium" | "low" }],
  "rewrites": [{
    "original": string (exact text from resume),
    "rewritten": string (SE/SA-optimized version),
    "reason": string (why this change matters)
  }],
  "missing": [{ "item": string, "detail": string }],
  "redFlags": [{ "flag": string, "detail": string }],
  "nextSteps": [string] (ordered list of 3-5 concrete actions)
}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const claude = ClaudeClient.getInstance();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulated = "";

          const aiStream = await claude.client.messages.stream({
            model: claude.defaultModel,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: "application/pdf",
                      data: base64,
                    },
                  } as never,
                  {
                    type: "text",
                    text: `Analyze this resume for SE/SA positioning at: ${config.targetCompanies.join(", ")}. Return JSON only.`,
                  },
                ],
              },
            ],
          });

          for await (const chunk of aiStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              accumulated += chunk.delta.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Resume analysis failed";
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
