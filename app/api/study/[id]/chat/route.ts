import { NextRequest } from "next/server";
import { prisma } from "../../../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../../../infrastructure/ai/ClaudeClient";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// POST /api/study/[id]/chat
// Body: { message: string, questionContext?: string }
// Returns: text/event-stream - streaming tutor response
// Side effect: appends exchange to guide.chatHistory
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const claude = ClaudeClient.getInstance();
    const encoder = new TextEncoder();

    const conversationMessages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullReply = "";

          const aiStream = await claude.client.messages.stream({
            model: claude.defaultModel,
            max_tokens: 1024,
            system: systemPrompt,
            messages: conversationMessages,
          });

          for await (const chunk of aiStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const text = chunk.delta.text;
              fullReply += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Persist the exchange asynchronously
          const updatedHistory: ChatMessage[] = [
            ...history,
            { role: "user", content: message },
            { role: "assistant", content: fullReply },
          ];
          // Keep last 40 messages to avoid unbounded growth
          const trimmed = updatedHistory.slice(-40);
          await prisma.studyGuide.update({
            where: { id },
            data: { chatHistory: JSON.stringify(trimmed) },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Tutor error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
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
