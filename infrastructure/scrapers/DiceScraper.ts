import type { IJobScanner } from "../../domain/ports/IJobScanner";
import type { JobMatch, ScanPreferences } from "../../domain/entities/JobMatch";

// Dice.com exposes a public search API used by their web frontend.
// Tech-focused, has good filtering for employment type.
export class DiceScraper implements IJobScanner {
  async scan(prefs: ScanPreferences): Promise<JobMatch[]> {
    const jobs: JobMatch[] = [];

    for (const keyword of prefs.roleKeywords.slice(0, 2)) {
      try {
        const results = await this.fetchJobs(keyword, prefs);
        jobs.push(...results);
      } catch (err) {
        console.warn(`[DiceScraper] Failed for "${keyword}":`, err);
      }
    }

    return jobs;
  }

  private async fetchJobs(
    keyword: string,
    prefs: ScanPreferences
  ): Promise<JobMatch[]> {
    const locationStr = prefs.locations
      .filter((l) => l.toLowerCase() !== "remote")
      .join("|");

    const params = new URLSearchParams({
      q: keyword,
      location: locationStr,
      radius: "50",
      radiusUnit: "Miles",
      page: "1",
      pageSize: "30",
      facets: "employmentType",
      fields: "id,title,company,location,employmentType,applyUrl,postedDate",
      employment: prefs.directHireOnly ? "FULLTIME" : "FULLTIME,PARTTIME",
      remote: prefs.locations.some((l) => l.toLowerCase() === "remote")
        ? "true"
        : "false",
    });

    const res = await fetch(
      `https://job-search-api.svc.dhigroupinc.com/v1/dice/jobs/search?${params}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; profile-optimizer/1.0)",
          "x-api-key": "1YAt0R9wBg4WfsF9VB2778F5CHLAPMVW3WAZcKd8",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`Dice API returned ${res.status}`);
    const data = await res.json();
    const listings = data.data ?? [];

    return listings.map(
      (item: Record<string, unknown>): JobMatch => ({
        id: crypto.randomUUID(),
        scannedAt: new Date(),
        title: String(item.title ?? ""),
        company: String(item.company ?? ""),
        location: String(item.location ?? ""),
        url: String(item.applyUrl ?? `https://www.dice.com/job-detail/${item.id}`),
        board: "dice",
        matchScore: 0,
        isContract: this.isContract(item),
      })
    );
  }

  private isContract(item: Record<string, unknown>): boolean {
    const type = String(item.employmentType ?? "").toLowerCase();
    return type.includes("contract") || type.includes("third") || type.includes("c2c");
  }
}
