import { IndeedScraper } from "../infrastructure/scrapers/IndeedScraper";
import { LevelsFyiScraper } from "../infrastructure/scrapers/LevelsFyiScraper";
import { LinkedInJobsScraper } from "../infrastructure/scrapers/LinkedInJobsScraper";
import { DiceScraper } from "../infrastructure/scrapers/DiceScraper";
import { JobRankerAgent } from "../infrastructure/ai/agents/JobRankerAgent";
import { prisma } from "../infrastructure/db/PrismaClient";
import type { JobMatch, ScanPreferences } from "../domain/entities/JobMatch";

const SCRAPERS = {
  indeed: IndeedScraper,
  levels: LevelsFyiScraper,
  linkedin: LinkedInJobsScraper,
  dice: DiceScraper,
};

export class ScanJobsUseCase {
  private ranker = new JobRankerAgent();

  async scan(prefs: ScanPreferences): Promise<JobMatch[]> {
    // Create scan run record
    const scanRun = await prisma.scanRun.create({
      data: { status: "running" },
    });

    try {
      // Fan out to requested scrapers in parallel
      const scraperResults = await Promise.allSettled(
        prefs.boards.map((board) => {
          const ScraperClass = SCRAPERS[board];
          if (!ScraperClass) return Promise.resolve([] as JobMatch[]);
          return new ScraperClass().scan(prefs);
        })
      );

      const rawJobs = scraperResults
        .filter((r): r is PromiseFulfilledResult<JobMatch[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);

      if (rawJobs.length === 0) {
        await prisma.scanRun.update({
          where: { id: scanRun.id },
          data: { status: "complete" },
        });
        return [];
      }

      // Deduplicate by URL
      const unique = Array.from(new Map(rawJobs.map((j) => [j.url, j])).values());

      // Score with AI ranker
      const rankings = await this.ranker.rankJobs(unique, prefs);
      const rankMap = new Map(rankings.map((r) => [r.url, r]));

      const scored: JobMatch[] = unique.map((job) => {
        const ranking = rankMap.get(job.url);
        return {
          ...job,
          matchScore: ranking?.matchScore ?? 0,
          fitReason: ranking?.fitReason,
          isContract: ranking?.isContract ?? job.isContract,
        };
      });

      // Sort by match score descending
      scored.sort((a, b) => b.matchScore - a.matchScore);

      // Persist
      await prisma.scanRun.update({
        where: { id: scanRun.id },
        data: {
          status: "complete",
          matches: {
            create: scored.map((job) => ({
              title: job.title,
              company: job.company,
              location: job.location,
              url: job.url,
              board: job.board,
              matchScore: job.matchScore,
              fitReason: job.fitReason,
              isContract: job.isContract,
            })),
          },
        },
      });

      return scored;
    } catch (err) {
      await prisma.scanRun.update({
        where: { id: scanRun.id },
        data: { status: "failed" },
      });
      throw err;
    }
  }
}
