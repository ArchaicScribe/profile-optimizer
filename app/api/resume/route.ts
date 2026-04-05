import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 90;

// POST /api/resume
// Accepts multipart form data with:
//   - file: Resume PDF (required)
//   - jd: Job Description PDF (optional)
//   - jdText: Job Description text (optional, alternative to jd PDF)
// Returns: text/event-stream - streaming SE/SA-focused resume analysis
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jdFile = formData.get("jd") as File | null;
    const jdText = formData.get("jdText") as string | null;

    if (!file || !file.name.endsWith(".pdf")) {
      return Response.json({ error: "Please upload a PDF resume." }, { status: 400 });
    }

    const config = await getUserConfig();
    const goalsContext = buildGoalsContext(config);
    const hasJDFile = jdFile && jdFile.name.endsWith(".pdf");
    const hasJDText = jdText && jdText.trim().length > 0;
    const hasJD = hasJDFile || hasJDText;

    const systemPrompt = `You are a brutally honest career coach and hiring manager who has worked at Amazon, Microsoft, and Snowflake in Solutions Engineering and Solutions Architecture leadership, with deep knowledge of Seattle-area tech hiring.

${goalsContext}

Your job is to evaluate this resume for customer-facing technical roles: Solutions Engineer (SE), Solutions Architect (SA), Customer Engineer (CE), Customer Architect (CA), and Partner Architect. These roles share a common profile - trusted technical advisor, pre-sales and post-sales engagement, system design for customers, cross-functional influence. Evaluate against that bar at Seattle-area and top-tier tech companies. Be specific, direct, and actionable. Do not be encouraging for its own sake.

Analyze:
1. Overall SE/SA/CA positioning score (0-100)
2. What reads well for SE/SA/CA hiring managers at the target companies
3. What actively hurts the candidacy (solo contributor language, implementation-only framing, government/contractor signals, etc.)
4. Specific bullet rewrites - take the weakest bullets and show exactly how to reframe them for SE/SA/CA
5. What is entirely missing that SE/SA/CA resumes at Amazon, Microsoft, Google, Snowflake need
6. Red flags a recruiter or hiring manager at a Seattle-area tech company would flag
${hasJD ? "7. A detailed comparison of the resume against the provided job description" : ""}

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
  "nextSteps": [string] (ordered list of 3-5 concrete actions)${hasJD ? `,
  "jdComparison": {
    "fitScore": number (0-100, how well this resume matches the specific JD requirements),
    "verdict": string (1-sentence: how well positioned for this specific role),
    "matched": [string] (JD requirements this resume clearly meets),
    "gaps": [string] (JD requirements the resume does not address),
    "tailoringTips": [string] (3-5 specific edits to make this resume stronger for this exact JD)
  }` : ""}
}`;

    const resumeBuffer = Buffer.from(await file.arrayBuffer());
    const resumeBase64 = resumeBuffer.toString("base64");

    const contentBlocks: object[] = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: resumeBase64 } },
    ];

    if (hasJDFile) {
      const jdBuffer = Buffer.from(await jdFile.arrayBuffer());
      const jdBase64 = jdBuffer.toString("base64");
      contentBlocks.push(
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: jdBase64 } }
      );
    } else if (hasJDText) {
      contentBlocks.push({
        type: "text",
        text: `JOB DESCRIPTION:\n\n${jdText!.trim()}`,
      });
    }

    contentBlocks.push({
      type: "text",
      text: hasJD
        ? `The first document is the resume. ${hasJDFile ? "The second document is the job description." : "The job description text is provided above."} Analyze the resume for SE/SA/CA positioning at: ${config.targetCompanies.join(", ")}, and compare it against the job description. Return JSON only.`
        : `Analyze this resume for SE/SA/CA positioning (Solutions Engineer, Solutions Architect, Customer Engineer, Customer Architect) at: ${config.targetCompanies.join(", ")}. Return JSON only.`,
    });

    const claude = ClaudeClient.getInstance();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = await claude.client.messages.stream({
            model: claude.defaultModel,
            max_tokens: 4096,
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
