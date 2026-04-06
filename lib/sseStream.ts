/**
 * Server-Sent Events streaming utilities.
 *
 * Usage:
 *   return sseStream(claude.streamText(system, user));
 *   return sseStream(claude.streamContent(system, messages, 2048));
 *
 * Each yielded string is sent as:  data: {"chunk":"..."}\n\n
 * Completion:                       data: [DONE]\n\n
 * Errors:                           data: {"error":"..."}\n\n
 */

export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

export function sseStream(source: AsyncIterable<string>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));
      try {
        for await (const chunk of source) {
          send(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        send("data: [DONE]\n\n");
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        send(`data: ${JSON.stringify({ error: message })}\n\n`);
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
