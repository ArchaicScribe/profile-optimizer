import Anthropic from "@anthropic-ai/sdk";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { extractJson } from "../../lib/extractJson";

// Configure global proxy for Node.js fetch (used by Anthropic SDK) if running in
// a sandboxed environment that requires egress routing through a proxy.
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.GLOBAL_AGENT_HTTP_PROXY;

if (proxyUrl) {
  try {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  } catch {
    // Ignore — proxy not required in all environments (e.g. user's local machine)
  }
}

// Singleton wrapper around the Anthropic SDK.
export class ClaudeClient {
  private static instance: ClaudeClient;
  readonly client: Anthropic;
  readonly defaultModel = "claude-sonnet-4-6";

  private constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    // Session ingress tokens (sk-ant-si-*) use Bearer auth.
    // Regular API keys (sk-ant-api-*) use x-api-key (SDK default).
    const isSessionToken = apiKey.startsWith("sk-ant-si-");
    this.client = isSessionToken
      ? new Anthropic({ apiKey: null as never, authToken: apiKey })
      : new Anthropic({ apiKey });
  }

  static getInstance(): ClaudeClient {
    if (!ClaudeClient.instance) {
      ClaudeClient.instance = new ClaudeClient();
    }
    return ClaudeClient.instance;
  }

  /** Stream a multi-turn or multimodal conversation (e.g. PDF document blocks). */
  async *streamContent(
    systemPrompt: string,
    messages: Anthropic.MessageParam[],
    maxTokens = 4096,
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: this.defaultModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        yield chunk.delta.text;
      }
    }
  }

  /** Stream a single-turn text conversation. */
  streamText(systemPrompt: string, userMessage: string, maxTokens = 4096): AsyncGenerator<string> {
    return this.streamContent(systemPrompt, [{ role: "user", content: userMessage }], maxTokens);
  }

  /** Get the full text response in one call. Uses the non-streaming API — more efficient when
   *  the caller doesn't need to forward chunks to a client. */
  async complete(systemPrompt: string, userMessage: string, maxTokens = 4096): Promise<string> {
    return this.completeContent(systemPrompt, [{ role: "user", content: userMessage }], maxTokens);
  }

  /** Same as complete() but for multimodal / multi-turn messages. */
  async completeContent(
    systemPrompt: string,
    messages: Anthropic.MessageParam[],
    maxTokens = 4096,
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.defaultModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });
    return this.extractText(response.content);
  }

  /** Convenience: complete() + JSON extraction. Returns a typed parsed object. */
  async completeJson<T>(systemPrompt: string, userMessage: string, maxTokens = 4096): Promise<T> {
    const text = await this.complete(systemPrompt, userMessage, maxTokens);
    return extractJson(text) as T;
  }

  async completeWithTools<T>(
    systemPrompt: string,
    userMessage: string,
    tools: Anthropic.Tool[],
  ): Promise<{ content: string; toolResults: T[] }> {
    const response = await this.client.messages.create({
      model: this.defaultModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools,
    });

    return {
      content: this.extractText(response.content),
      toolResults: response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map((b) => b.input as T),
    };
  }

  private extractText(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}
