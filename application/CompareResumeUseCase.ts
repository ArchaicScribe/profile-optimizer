import { ResumeComparatorAgent } from "../infrastructure/ai/agents/ResumeComparatorAgent";

// Coordinates resume-to-JD comparison:
// 1. Accept resume PDF (required) and optional JD (PDF or text)
// 2. Stream the Claude analysis
export class CompareResumeUseCase {
  private agent = new ResumeComparatorAgent();

  async *compare(
    resumeFile: File,
    jdFile?: File,
    jdText?: string,
  ): AsyncGenerator<string> {
    const stream = await this.agent.compare(resumeFile, jdFile, jdText);
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
