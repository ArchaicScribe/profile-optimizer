import { ClaudeClient } from "../ClaudeClient";
import { getGoalsContext } from "../../db/getUserConfig";
import type { IAuditAgent, ParsedLinkedInData } from "../../../domain/ports/IAuditAgent";

function buildSystemPrompt(goalsContext: string): string {
  return `You are a senior career strategist specializing in helping software engineers transition into customer-facing technical roles at top-tier technology companies. These roles include: Solutions Engineer (SE), Solutions Architect (SA), Customer Engineer (CE), Customer Architect (CA), Partner Architect, and Technical Account Manager (TAM) - particularly at Seattle-area companies (Amazon, Microsoft, Google, Tableau/Salesforce, Snowflake, Databricks, Expedia, T-Mobile, Zillow, F5) and similar high-caliber tech firms.

${goalsContext}

Your job is to audit LinkedIn profiles and personal websites for signals that help or hurt this specific transition. You are not auditing for generic job-seeking -- you are evaluating positioning for SE/SA/CA/CE roles at high-caliber tech companies, with particular weight on Seattle-area companies.

When auditing, analyze:
1. SOLO CONTRIBUTOR FRAMING - Language like "independently built/designed/implemented" signals an IC who works alone. SE/SA roles require collaboration, customer engagement, and cross-functional influence. Flag this.
2. ADVISORY AND CONSULTING SIGNALS - Evidence of explaining complex systems to non-technical stakeholders, architecting solutions for others, leading technical direction. These are gold for SE/SA.
3. CLIENT AND CUSTOMER FACING EXPERIENCE - Any evidence of working with external customers, running demos, participating in sales cycles, writing proposals or architecture docs.
4. SYSTEM DESIGN BREADTH - Evidence of designing at scale, making trade-off decisions, working across multiple systems rather than deep in one codebase.
5. CLOUD AND PLATFORM DEPTH - Specific cloud services, platform expertise relevant to target companies (e.g., data platform experience for Snowflake/Databricks).
6. ENTERPRISE CREDIBILITY - Experience with enterprise-scale systems, security, compliance, observability, which matters to SE/SA buyers at target companies.
7. TONE AND POSITIONING - Does the profile read like a builder or an advisor? SE/SA candidates need to read as trusted technical advisors, not implementers.
8. MISSING SIGNALS - What would make this profile dramatically stronger for the target role.

Output structured analysis with:
- An overall score (0-100, where 100 = ideal SE/SA candidate for target companies)
- A list of signals with type (contract_attractor | location_attractor | positive | neutral) and severity (high | medium | low)
- Prioritized recommendations with category (keywords | location | tone | experience | skills)
- A list of phrases to avoid: words and patterns that undercut SE/SA positioning. Group by context (solo_contributor | implementation_speak | staffing_agency | geographic | general).

Format your response as valid JSON matching this schema:
{
  "auditScore": number,
  "signals": [{ "text": string, "type": string, "severity": string }],
  "recommendations": [{ "title": string, "body": string, "priority": string, "category": string }],
  "summary": string,
  "phrasesToAvoid": [{ "phrase": string, "reason": string, "context": string }]
}`;
}

function buildExportMessage(
  data: ParsedLinkedInData,
  siteContent?: string,
  targetCompanies: string[] = [],
): string {
  const parts = [
    "Please audit the following LinkedIn profile for SE/SA positioning at top-tier tech companies.",
    `Target companies: ${targetCompanies.join(", ")}`,
    "",
    "## Profile Data",
    `Headline: ${data.headline ?? "(none)"}`,
    `Location: ${data.location ?? "(none)"}`,
    `Open to Work: ${data.openToWork ? "YES - this is a red flag for contract mills" : "No"}`,
    `Summary: ${data.summary ?? "(none)"}`,
    "",
    "## Positions",
    ...data.positions.map(
      (p) => `- ${p.title} at ${p.company} (${p.startDate ?? "?"} to ${p.endDate ?? "present"})\n  ${p.description ?? ""}`,
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

export class ProfileAuditorAgent implements IAuditAgent {
  private claude = ClaudeClient.getInstance();

  async auditFromExport(
    data: ParsedLinkedInData,
    siteContent?: string,
  ): Promise<AsyncIterable<string>> {
    const { config, goalsContext } = await getGoalsContext();
    const systemPrompt = buildSystemPrompt(goalsContext);
    return this.claude.streamText(systemPrompt, buildExportMessage(data, siteContent, config.targetCompanies));
  }

  async auditFromUrl(url: string): Promise<AsyncIterable<string>> {
    const { config, goalsContext } = await getGoalsContext();
    const systemPrompt = buildSystemPrompt(goalsContext);

    const userMessage = `Please audit the personal/portfolio website at this URL for SE/SA positioning at top-tier tech companies: ${url}

Target companies: ${config.targetCompanies.join(", ")}

Focus on:
- Whether the candidate reads as a trusted technical advisor vs. an implementer
- Evidence of system design thinking, customer-facing work, cross-functional collaboration
- Keywords and framing that help or hurt SE/SA candidacy at the target companies
- What is missing that would dramatically strengthen this profile for SE/SA roles

Return your analysis as JSON matching the schema in your instructions.`;

    return this.claude.streamText(systemPrompt, userMessage);
  }
}
