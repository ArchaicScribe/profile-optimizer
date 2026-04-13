import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./types";

/**
 * Builds the Anthropic messages array for a multi-turn chat, injecting
 * a context block into the first user message. Consistent pattern used
 * across all chat routes that prepend session context.
 */
export function buildMessages(
  contextBlock: string,
  message: string,
  history: ChatMessage[],
  separator = "\n\n---\n\n",
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  if (history.length === 0) {
    messages.push({ role: "user", content: `${contextBlock}${separator}${message}` });
  } else {
    const [firstUser, ...rest] = history;
    messages.push({ role: "user", content: `${contextBlock}${separator}${firstUser.content}` });
    for (const msg of rest) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });
  }

  return messages;
}
