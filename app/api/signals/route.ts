import { AnalyzeSignalsUseCase } from "../../../application/AnalyzeSignalsUseCase";

export const runtime = "nodejs";

const useCase = new AnalyzeSignalsUseCase();

// GET /api/signals
// Returns: SignalSummary aggregated across all past audits
export async function GET() {
  try {
    const summary = await useCase.getSummary();
    return Response.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load signals";
    return Response.json({ error: message }, { status: 500 });
  }
}
