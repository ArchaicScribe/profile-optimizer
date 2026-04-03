#!/usr/bin/env tsx
import { program } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Load env before importing anything that reads process.env
import "dotenv/config";

program
  .name("profile-optimizer")
  .description("AI-powered LinkedIn profile auditor and job scanner")
  .version("1.0.0");

// -------------------------------------------------------------------
// audit command
// -------------------------------------------------------------------
program
  .command("audit")
  .description("Audit your LinkedIn profile or personal site")
  .option("--export <path>", "Path to LinkedIn data export ZIP")
  .option("--url <url>", "URL to audit (personal site or portfolio)")
  .option("--site-url <url>", "Personal site URL to include alongside export audit")
  .action(async (opts) => {
    const { AuditProfileUseCase } = await import("../application/AuditProfileUseCase");
    const useCase = new AuditProfileUseCase();

    console.log("\nRunning profile audit...\n");

    let generator: AsyncGenerator<string>;

    if (opts.export) {
      const buffer = readFileSync(resolve(opts.export));
      generator = useCase.auditFromExport(buffer, opts.siteUrl);
    } else if (opts.url) {
      generator = useCase.auditFromUrl(opts.url);
    } else {
      console.error("Error: provide --export <zip> or --url <url>");
      process.exit(1);
    }

    let fullOutput = "";
    for await (const chunk of generator) {
      process.stdout.write(chunk);
      fullOutput += chunk;
    }

    console.log("\n\nAudit complete. Results saved to database.");
  });

// -------------------------------------------------------------------
// jobs command
// -------------------------------------------------------------------
program
  .command("jobs")
  .description("Scan job boards for matching roles")
  .option(
    "--location <locations>",
    "Comma-separated target locations",
    "Seattle, Boston, Remote"
  )
  .option(
    "--exclude-location <locations>",
    "Comma-separated locations to exclude",
    "Albuquerque, New Mexico"
  )
  .option(
    "--keywords <keywords>",
    "Comma-separated role keywords",
    "Senior Software Engineer"
  )
  .option("--boards <boards>", "Comma-separated boards", "indeed,levels,dice")
  .option("--no-direct-hire-only", "Include contract roles")
  .action(async (opts) => {
    const { ScanJobsUseCase } = await import("../application/ScanJobsUseCase");
    const useCase = new ScanJobsUseCase();

    const prefs = {
      locations: opts.location.split(",").map((s: string) => s.trim()),
      excludeLocations: opts.excludeLocation
        .split(",")
        .map((s: string) => s.trim()),
      roleKeywords: opts.keywords.split(",").map((s: string) => s.trim()),
      excludeKeywords: ["contract", "C2C", "corp to corp", "1099"],
      directHireOnly: opts.directHireOnly !== false,
      boards: opts.boards.split(",").map((s: string) => s.trim()),
    };

    console.log(
      `\nScanning ${prefs.boards.join(", ")} for roles in ${prefs.locations.join(", ")}...\n`
    );

    const jobs = await useCase.scan(prefs as Parameters<typeof useCase.scan>[0]);

    if (jobs.length === 0) {
      console.log("No matches found.");
      return;
    }

    console.log(`Found ${jobs.length} match(es):\n`);
    jobs.forEach((job, i) => {
      console.log(
        `${i + 1}. [${job.matchScore}] ${job.title} - ${job.company} (${job.location})`
      );
      console.log(`   ${job.url}`);
      if (job.fitReason) console.log(`   ${job.fitReason}`);
      console.log();
    });
  });

program.parse();
