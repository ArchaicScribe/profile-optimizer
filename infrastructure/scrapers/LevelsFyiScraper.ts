import type { IJobScanner } from "../../domain/ports/IJobScanner";
import type { JobMatch, ScanPreferences } from "../../domain/entities/JobMatch";

// Levels.fyi has an undocumented JSON API used by their web app.
// Only well-established companies post here — no staffing agencies.
// This scraper fetches from their public job listings endpoint.
export class LevelsFyiScraper implements IJobScanner {
  private readonly BASE_URL = "https://www.levels.fyi/jobs";

  async scan(prefs: ScanPreferences): Promise<JobMatch[]> {
    const jobs: JobMatch[] = [];

    try {
      const results = await this.fetchJobs(prefs.roleKeywords, prefs.locations);
      jobs.push(...this.filterResults(results, prefs));
    } catch (err) {
      console.warn("[LevelsFyiScraper] Scan failed:", err);
    }

    return jobs;
  }

  private async fetchJobs(
    keywords: string[],
    locations: string[]
  ): Promise<JobMatch[]> {
    const params = new URLSearchParams({
      search: keywords.slice(0, 2).join(" "),
      location: locations.filter((l) => l.toLowerCase() !== "remote").join(","),
      remote: locations.some((l) => l.toLowerCase() === "remote") ? "true" : "false",
    });

    const url = `https://www.levels.fyi/js/jobsBoard.json`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; profile-optimizer/1.0)",
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error(`Levels.fyi returned ${res.status}`);

    const data = await res.json();
    const listings = Array.isArray(data) ? data : (data.jobs ?? data.listings ?? []);

    return listings.slice(0, 50).map(
      (item: Record<string, unknown>): JobMatch => ({
        id: crypto.randomUUID(),
        scannedAt: new Date(),
        title: String(item.title ?? item.role ?? ""),
        company: String(item.company_name ?? item.company ?? ""),
        location: String(item.location ?? ""),
        url: String(item.url ?? item.apply_url ?? `${this.BASE_URL}`),
        board: "levels",
        matchScore: 0,
        isContract: false, // Levels.fyi only has FTE roles
      })
    );
  }

  private filterResults(jobs: JobMatch[], prefs: ScanPreferences): JobMatch[] {
    return jobs.filter((job) => {
      if (!job.title) return false;
      if (prefs.excludeLocations.some((loc) =>
        job.location.toLowerCase().includes(loc.toLowerCase())
      )) return false;
      return true;
    });
  }
}
