import Anthropic from "@anthropic-ai/sdk";
import { ProxyAgent, setGlobalDispatcher } from "undici";

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

  async *streamText(
    systemPrompt: string,
    userMessage: string,
    maxTokens = 4096,
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: this.defaultModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        yield chunk.delta.text;
      }
    }
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

  /** Collect the full streamed text response in one call (non-streaming use cases). */
  async complete(systemPrompt: string, userMessage: string, maxTokens = 4096): Promise<string> {
    let result = "";
    for await (const chunk of this.streamText(systemPrompt, userMessage, maxTokens)) result += chunk;
    return result;
  }

  /** Same as complete() but for multimodal / multi-turn messages. */
  async completeContent(
    systemPrompt: string,
    messages: Anthropic.MessageParam[],
    maxTokens = 4096,
  ): Promise<string> {
    let result = "";
    for await (const chunk of this.streamContent(systemPrompt, messages, maxTokens)) result += chunk;
    return result;
  }

  async completeWithTools<T>(
    systemPrompt: string,
    userMessage: string,
    tools: Anthropic.Tool[]
  ): Promise<{ content: string; toolResults: T[] }> {
    const response = await this.client.messages.create({
      model: this.defaultModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools,
    });

    const textContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    const toolResults = response.content
      .filter((b) => b.type === "tool_use")
      .map((b) => (b as Anthropic.ToolUseBlock).input as T);

    return { content: textContent, toolResults };
  }
}
