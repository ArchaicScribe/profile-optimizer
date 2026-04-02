import Anthropic from "@anthropic-ai/sdk";

// Singleton wrapper around the Anthropic SDK.
// All agent classes consume this instead of instantiating the SDK directly,
// so swapping providers later only requires changing this file.
export class ClaudeClient {
  private static instance: ClaudeClient;
  readonly client: Anthropic;
  readonly defaultModel = "claude-sonnet-4-6";

  private constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  static getInstance(): ClaudeClient {
    if (!ClaudeClient.instance) {
      ClaudeClient.instance = new ClaudeClient();
    }
    return ClaudeClient.instance;
  }

  async *streamText(
    systemPrompt: string,
    userMessage: string
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: this.defaultModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield chunk.delta.text;
      }
    }
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
