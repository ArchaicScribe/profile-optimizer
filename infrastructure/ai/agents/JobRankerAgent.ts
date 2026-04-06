import { ClaudeClient } from "../ClaudeClient";
import { extractJson } from "../../../lib/extractJson";
import type { JobMatch, ScanPreferences } from "../../../domain/entities/JobMatch";

type RankedJob = { url: string; matchScore: number; fitReason: string; isContract: boolean };

const SYSTEM_PROMPT = `You are a job match analyst. Given a list of scraped job postings and a candidate's preferences, score each job on a 0-100 scale and explain why it is or isn't a good match.

A score of 80+ means: direct hire, well-established company, strong alignment with candidate skills.
A score of 50-79 means: worth reviewing but has caveats.
A score below 50 means: likely a poor match (contract, wrong location, wrong level, etc.).

Return ONLY valid JSON as an array: [{ "url": string, "matchScore": number, "fitReason": string, "isContract": boolean }]`;

export class JobRankerAgent {
  private claude = ClaudeClient.getInstance();

  async rankJobs(
    jobs: Omit<JobMatch, "matchScore" | "fitReason">[],
    prefs: ScanPreferences,
  ): Promise<RankedJob[]> {
    const userMessage = `Candidate preferences:
- Target locations: ${prefs.locations.join(", ")}
- Exclude locations: ${prefs.excludeLocations.join(", ")}
- Role keywords: ${prefs.roleKeywords.join(", ")}
- Exclude keywords: ${prefs.excludeKeywords.join(", ")}
- Direct hire only: ${prefs.directHireOnly}

Jobs to rank:
${JSON.stringify(
  jobs.map((j) => ({ url: j.url, title: j.title, company: j.company, location: j.location, board: j.board })),
  null,
  2,
)}

Return the ranked array as specified.`;

    try {
      const text = await this.claude.complete(SYSTEM_PROMPT, userMessage);
      // extractJson handles objects; for arrays match the outermost [...] block
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      return JSON.parse(match[0]) as RankedJob[];
    } catch {
      return [];
    }
  }
}
