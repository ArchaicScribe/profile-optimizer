import { ClaudeClient } from "../ClaudeClient";
import type { IAuditAgent, ParsedLinkedInData } from "../../../domain/ports/IAuditAgent";

const SYSTEM_PROMPT = `You are a senior career strategist and technical recruiter analyst.
Your job is to audit LinkedIn profiles and personal websites, identifying signals that
attract the wrong type of recruiters (contract roles, staffing agencies, NM/low-quality
matches) versus well-established technology companies.

When auditing, analyze:
1. KEYWORDS that attract contract mills (e.g., "available", "open to work", government/defense contractor language)
2. LOCATION signals that may attract regional recruiters
3. TONE and framing that positions the candidate as a contractor vs. employee
4. MISSING signals that would attract top-tier companies (FAANG-adjacent, product companies, Series B+)
5. EXPERIENCE framing — NDA work is fine, but how it's described matters

Output structured analysis with:
- An overall score (0-100, where 100 = ideal for attracting well-established company direct-hire roles)
- A list of signals with type (contract_attractor | location_attractor | positive | neutral) and severity (high | medium | low)
- Prioritized recommendations with category (keywords | location | tone | experience | skills)
- A list of phrases to avoid: specific words, phrases, or patterns that attract staffing agencies, contract mills, or undesired geographic recruiters. Group them by context (staffing_agency | geographic | general).

Format your response as valid JSON matching this schema:
{
  "auditScore": number,
  "signals": [{ "text": string, "type": string, "severity": string }],
  "recommendations": [{ "title": string, "body": string, "priority": string, "category": string }],
  "summary": string,
  "phrasesToAvoid": [{ "phrase": string, "reason": string, "context": string }]
}`;

export class ProfileAuditorAgent implements IAuditAgent {
  private claude = ClaudeClient.getInstance();

  async auditFromExport(
    data: ParsedLinkedInData,
    siteContent?: string
  ): Promise<AsyncIterable<string>> {
    const userMessage = this.buildExportMessage(data, siteContent);
    return this.claude.streamText(SYSTEM_PROMPT, userMessage);
  }

  async auditFromUrl(url: string): Promise<AsyncIterable<string>> {
    const userMessage = `Please audit the personal/portfolio website at this URL for recruiter signal optimization: ${url}

Focus on:
- How the candidate positions themselves (contractor vs. direct-hire employee)
- Keywords present that might attract the wrong recruiter pool
- What's missing that would attract well-established tech companies
- Location signals

Return your analysis as JSON matching the schema specified in your instructions.`;

    return this.claude.streamText(SYSTEM_PROMPT, userMessage);
  }

  private buildExportMessage(
    data: ParsedLinkedInData,
    siteContent?: string
  ): string {
    const parts = [
      "Please audit the following LinkedIn profile data for recruiter signal optimization.",
      "",
      `## Profile Data`,
      `Headline: ${data.headline ?? "(none)"}`,
      `Location: ${data.location ?? "(none)"}`,
      `Open to Work: ${data.openToWork ? "YES - this is a red flag for contract mills" : "No"}`,
      `Summary: ${data.summary ?? "(none)"}`,
      "",
      "## Positions",
      ...data.positions.map(
        (p) =>
          `- ${p.title} at ${p.company} (${p.startDate ?? "?"} – ${p.endDate ?? "present"})\n  ${p.description ?? ""}`
      ),
      "",
      "## Skills",
      data.skills.join(", "),
    ];

    if (siteContent) {
      parts.push("", "## Personal Website Content", siteContent);
    }

    return parts.join("\n");
  }
}
