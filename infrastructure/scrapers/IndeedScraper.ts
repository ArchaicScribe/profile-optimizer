import type { IJobScanner } from "../../domain/ports/IJobScanner";
import type { JobMatch, ScanPreferences } from "../../domain/entities/JobMatch";

// Indeed exposes RSS feeds for job searches — no Playwright required,
// and RSS is not prohibited by their ToS for personal use.
// Feed URL pattern: https://www.indeed.com/rss?q=<query>&l=<location>
export class IndeedScraper implements IJobScanner {
  async scan(prefs: ScanPreferences): Promise<JobMatch[]> {
    const jobs: JobMatch[] = [];

    for (const location of prefs.locations) {
      for (const keyword of prefs.roleKeywords.slice(0, 2)) {
        try {
          const results = await this.fetchRssFeed(keyword, location);
          jobs.push(...results);
        } catch (err) {
          console.warn(`[IndeedScraper] Failed for "${keyword}" in "${location}":`, err);
        }
      }
    }

    return this.filterResults(jobs, prefs);
  }

  private async fetchRssFeed(
    query: string,
    location: string
  ): Promise<JobMatch[]> {
    const params = new URLSearchParams({
      q: query,
      l: location,
      sort: "date",
      limit: "25",
    });
    const url = `https://www.indeed.com/rss?${params}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; profile-optimizer/1.0; personal use)",
      },
    });

    if (!res.ok) throw new Error(`Indeed RSS returned ${res.status}`);
    const xml = await res.text();
    return this.parseRssXml(xml);
  }

  private parseRssXml(xml: string): JobMatch[] {
    const items: JobMatch[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const item = match[1];
      const title = this.extractTag(item, "title");
      const link = this.extractTag(item, "link");
      const company = this.extractTag(item, "source") ?? this.extractCompany(item);
      const location = this.extractTag(item, "location") ?? "";

      if (!title || !link) continue;

      items.push({
        id: crypto.randomUUID(),
        scannedAt: new Date(),
        title,
        company: company ?? "Unknown",
        location,
        url: link,
        board: "indeed",
        matchScore: 0, // Scored by JobRankerAgent later
        isContract: this.isContractRole(title),
      });
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string | undefined {
    const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
    return (match?.[1] ?? match?.[2])?.trim();
  }

  private extractCompany(item: string): string | undefined {
    // Indeed sometimes puts company in description or author
    const match = item.match(/<author>([^<]+)<\/author>/);
    return match?.[1]?.trim();
  }

  private isContractRole(title: string): boolean {
    const contractTerms = /\b(contract|contractor|c2c|corp.to.corp|1099|temp|temporary|freelance)\b/i;
    return contractTerms.test(title);
  }

  private filterResults(jobs: JobMatch[], prefs: ScanPreferences): JobMatch[] {
    return jobs.filter((job) => {
      if (prefs.directHireOnly && job.isContract) return false;
      if (prefs.excludeLocations.some((loc) =>
        job.location.toLowerCase().includes(loc.toLowerCase())
      )) return false;
      if (prefs.excludeKeywords.some((kw) =>
        job.title.toLowerCase().includes(kw.toLowerCase())
      )) return false;
      return true;
    });
  }
}
