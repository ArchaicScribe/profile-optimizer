import { NextRequest } from "next/server";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 90;

interface MockMessage {
  role: "interviewer" | "candidate";
  content: string;
}

interface MockConfig {
  company: string;
  roleType: "behavioral" | "system_design" | "cloud_architecture" | "mixed";
  questionCount: number;
}

function buildSystemPrompt(goalsContext: string, config: MockConfig): string {
  return `You are conducting a realistic SE/SA/CA interview at ${config.company}. You are the hiring manager - senior, direct, and technical. You are evaluating for: Solutions Engineer, Solutions Architect, Customer Engineer, or Customer Architect.

${goalsContext}

Interview type: ${config.roleType}
Target question count: ${config.questionCount}

Your job:
1. Ask one real interview question per turn. Make it specific to ${config.company} and the SE/SA/CA role.
2. After the candidate answers (all turns after the first), briefly evaluate their answer BEFORE asking the next question.
3. Evaluation format: 2-3 sentences max. Note what was strong, what was missing, and one specific thing to add. Score 0-100. Be honest.
4. Then ask the next question. Progress through different aspects: technical depth, customer scenarios, architecture trade-off, behavioral.
5. On the final question turn, end your evaluation with "END_SESSION" on its own line after your evaluation.

For system_design: focus on designing systems at ${config.company}'s scale - data pipelines, multi-tenant SaaS, distributed systems. Include AWS and Azure service tradeoffs.
For cloud_architecture: focus on AWS vs Azure service selection, migration patterns, cost optimization, multi-region architecture.
For behavioral: focus on SE/SA/CA scenarios - customer escalations, architecture disagreements, pre-sales wins, cross-functional influence.
For mixed: rotate through all of the above.

Do not use em-dashes. Be direct. This is a real interview simulation.`;
}

function formatConversation(messages: MockMessage[]): string {
  const lines = messages.map((msg, i) => {
    const turn = i + 1;
    if (msg.role === "interviewer") {
      const label = i === 0 ? `[Turn ${turn} - Interviewer]` : `[Turn ${turn} - Interviewer feedback + next question]`;
      return `${label}: ${msg.content}`;
    }
    return `[Turn ${turn} - Candidate]: ${msg.content}`;
  });
  return lines.join("\n\n") + "\n\nYour response:";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, config } = body as { messages: MockMessage[]; config: MockConfig };

    if (!config?.company || !config?.roleType || !config?.questionCount) {
      return Response.json({ error: "Missing required config fields." }, { status: 400 });
    }

    const userConfig = await getUserConfig();
    const goalsContext = buildGoalsContext(userConfig);
    const systemPrompt = buildSystemPrompt(goalsContext, config);
    const conversationText = formatConversation(messages ?? []);

    const claude = ClaudeClient.getInstance();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of claude.streamText(systemPrompt, conversationText)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Interview generation failed";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
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
