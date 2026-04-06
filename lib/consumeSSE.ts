/**
 * Consume a Server-Sent Events stream from a fetch Response.
 *
 * Calls onChunk for each `{"chunk":"..."}` message.
 * Throws on `{"error":"..."}` messages or network failures.
 * Returns the fully accumulated string when the stream ends.
 */
export async function consumeSSE(
  response: Response,
  onChunk?: (chunk: string, accumulated: string) => void,
): Promise<string> {
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") return accumulated;
        const msg: { chunk?: string; error?: string } = JSON.parse(payload);
        if (msg.error) throw new Error(msg.error);
        if (msg.chunk) {
          accumulated += msg.chunk;
          onChunk?.(msg.chunk, accumulated);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}
