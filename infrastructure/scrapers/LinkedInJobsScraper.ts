import type { IJobScanner } from "../../domain/ports/IJobScanner";
import type { JobMatch, ScanPreferences } from "../../domain/entities/JobMatch";

// LinkedIn job listings are publicly accessible without authentication.
// This scraper uses their public job search endpoint.
// NOTE: This may conflict with LinkedIn's ToS. Use at your own discretion.
// The parser falls back gracefully if blocked.
export class LinkedInJobsScraper implements IJobScanner {
  async scan(prefs: ScanPreferences): Promise<JobMatch[]> {
    const jobs: JobMatch[] = [];

    for (const keyword of prefs.roleKeywords.slice(0, 2)) {
      for (const location of prefs.locations.slice(0, 2)) {
        try {
          const results = await this.fetchJobs(keyword, location, prefs);
          jobs.push(...results);
        } catch (err) {
          console.warn(
            `[LinkedInJobsScraper] Failed for "${keyword}" in "${location}":`,
            err
          );
          // Graceful degradation — other scrapers will still run
        }
      }
    }

    return jobs;
  }

  private async fetchJobs(
    keyword: string,
    location: string,
    prefs: ScanPreferences
  ): Promise<JobMatch[]> {
    const params = new URLSearchParams({
      keywords: keyword,
      location,
      f_JT: prefs.directHireOnly ? "F" : "F,C,T", // F=Full-time, C=Contract, T=Temporary
      sortBy: "DD", // Date descending
      count: "25",
    });

    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`LinkedIn returned ${res.status}`);
    const html = await res.text();
    return this.parseHtml(html);
  }

  private parseHtml(html: string): JobMatch[] {
    const jobs: JobMatch[] = [];

    // LinkedIn job cards in the guest API response contain structured data attributes
    const cardMatches = html.matchAll(
      /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?<\/li>/g
    );

    for (const match of cardMatches) {
      const card = match[0];
      const jobId = match[1];

      const title = this.extractContent(card, "job-search-card__title");
      const company = this.extractContent(card, "job-search-card__company-name");
      const location = this.extractContent(card, "job-search-card__location");

      if (!title) continue;

      jobs.push({
        id: crypto.randomUUID(),
        scannedAt: new Date(),
        title,
        company: company ?? "Unknown",
        location: location ?? "",
        url: `https://www.linkedin.com/jobs/view/${jobId}`,
        board: "linkedin",
        matchScore: 0,
        isContract: this.isContract(title),
      });
    }

    return jobs;
  }

  private extractContent(html: string, className: string): string | undefined {
    const match = html.match(
      new RegExp(`class="${className}"[^>]*>\\s*([^<]+)\\s*<`)
    );
    return match?.[1]?.trim();
  }

  private isContract(title: string): boolean {
    return /\b(contract|contractor|c2c|1099|temp|w2)\b/i.test(title);
  }
}
