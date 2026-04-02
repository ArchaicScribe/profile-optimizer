import { LinkedInExportParser } from "../infrastructure/scrapers/LinkedInExportParser";
import { ProfileAuditorAgent } from "../infrastructure/ai/agents/ProfileAuditorAgent";
import { prisma } from "../infrastructure/db/PrismaClient";
import type { ProfileAudit, RecruiterSignal, Recommendation } from "../domain/entities/ProfileAudit";

// Coordinates the full audit flow:
// 1. Parse the LinkedIn export ZIP (or accept a URL)
// 2. Stream the Claude analysis
// 3. Persist the result once streaming completes
export class AuditProfileUseCase {
  private parser = new LinkedInExportParser();
  private agent = new ProfileAuditorAgent();

  async *auditFromExport(
    zipBuffer: Buffer,
    siteUrl?: string
  ): AsyncGenerator<string> {
    const parsed = await this.parser.parseLinkedInExport(zipBuffer);

    let siteContent: string | undefined;
    if (siteUrl) {
      try {
        const res = await fetch(siteUrl);
        siteContent = await res.text();
        // Strip HTML tags for cleaner analysis
        siteContent = siteContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      } catch {
        // Non-fatal — audit continues without site content
      }
    }

    const stream = await this.agent.auditFromExport(parsed, siteContent);
    let fullResponse = "";

    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }

    await this.persistAudit("export", fullResponse);
  }

  async *auditFromUrl(url: string): AsyncGenerator<string> {
    const stream = await this.agent.auditFromUrl(url);
    let fullResponse = "";

    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }

    await this.persistAudit("url", fullResponse);
  }

  private async persistAudit(
    source: "export" | "url",
    rawResponse: string
  ): Promise<void> {
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const parsed = JSON.parse(jsonMatch[0]);

      await prisma.profileAudit.create({
        data: {
          source,
          rawData: rawResponse,
          auditScore: parsed.auditScore ?? 0,
          signals: {
            create: (parsed.signals ?? []).map((s: RecruiterSignal) => ({
              text: s.text,
              type: s.type,
              severity: s.severity,
            })),
          },
          recs: {
            create: (parsed.recommendations ?? []).map((r: Recommendation) => ({
              title: r.title,
              body: r.body,
              priority: r.priority,
              category: r.category,
            })),
          },
        },
      });
    } catch {
      // Persistence failure should not surface to the user during streaming
      console.error("[AuditProfileUseCase] Failed to persist audit result");
    }
  }
}
