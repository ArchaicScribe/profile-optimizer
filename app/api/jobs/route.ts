import { NextRequest } from "next/server";
import { ScanJobsUseCase } from "../../../application/ScanJobsUseCase";
import type { ScanPreferences } from "../../../domain/entities/JobMatch";

export const runtime = "nodejs";
export const maxDuration = 60;

const useCase = new ScanJobsUseCase();

// Default preferences oriented toward Alex's job search targets.
// The UI lets the user override these, but they're sensible out of the box.
const DEFAULT_PREFERENCES: ScanPreferences = {
  locations: ["Seattle", "Boston", "Remote"],
  excludeLocations: ["Albuquerque", "New Mexico", "NM"],
  roleKeywords: ["Senior Software Engineer", "Staff Software Engineer"],
  excludeKeywords: ["contract", "C2C", "corp to corp", "1099", "W2"],
  directHireOnly: true,
  boards: ["indeed", "levels", "dice"],
};

// POST /api/jobs
// Body: { preferences?: Partial<ScanPreferences> }
// Returns: { jobs: JobMatch[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const incoming = body.preferences ?? {};

    // Strip "linkedin" from any client-supplied boards array unless the operator
    // has explicitly opted in. This enforces the gate at the API boundary
    // regardless of what the client sends.
    if (Array.isArray(incoming.boards) && process.env.ENABLE_LINKEDIN_SCRAPER !== "true") {
      incoming.boards = incoming.boards.filter((b: string) => b !== "linkedin");
    }

    const prefs: ScanPreferences = {
      ...DEFAULT_PREFERENCES,
      ...incoming,
    };

    const jobs = await useCase.scan(prefs);
    return Response.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
