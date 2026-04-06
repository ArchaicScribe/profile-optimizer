import { NextRequest } from "next/server";
import { prisma } from "../../../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../../../infrastructure/ai/ClaudeClient";
import { SSE_HEADERS } from "../../../../../lib/sseStream";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// POST /api/study/[id]/chat
// Body: { message: string, questionContext?: string }
// Returns: text/event-stream — streaming tutor response
// Side effect: appends exchange to guide.chatHistory (persisted after stream completes)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { message, questionContext } = body as {
      message: string;
      questionContext?: string;
    };

    const guide = await prisma.studyGuide.findUnique({ where: { id } });
    if (!guide) {
      return Response.json({ error: "Guide not found." }, { status: 404 });
    }

    const history: ChatMessage[] = JSON.parse(guide.chatHistory);

    const systemPrompt = `You are an expert interview coach and tutor for software engineering roles.
The candidate is preparing for a ${guide.jobTitle} role at ${guide.company}.
${guide.jdSummary ? `Role context: ${guide.jdSummary}` : ""}

Your role:
- Give hints without giving away full answers unless the candidate is truly stuck
- Explain concepts clearly with examples
- If asked about a specific question, help the candidate reason through it step by step
- Cover DSA, system design, SQL, AI/ML, and behavioral topics
- Be encouraging but honest about gaps in understanding
- Do not use em-dashes

${questionContext ? `The candidate is currently working on this question:\n${questionContext}` : ""}`;

    const conversationMessages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    const claude = ClaudeClient.getInstance();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => controller.enqueue(encoder.encode(data));
        let fullReply = "";

        try {
          for await (const text of claude.streamContent(systemPrompt, conversationMessages, 1024)) {
            fullReply += text;
            send(`data: ${JSON.stringify({ chunk: text })}\n\n`);
          }

          send("data: [DONE]\n\n");
          controller.close();

          // Persist the exchange — keep last 40 messages to prevent unbounded growth
          const updatedHistory: ChatMessage[] = [
            ...history,
            { role: "user", content: message },
            { role: "assistant", content: fullReply },
          ];
          await prisma.studyGuide.update({
            where: { id },
            data: { chatHistory: JSON.stringify(updatedHistory.slice(-40)) },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Tutor error";
          send(`data: ${JSON.stringify({ error: msg })}\n\n`);
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
