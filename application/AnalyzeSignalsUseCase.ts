import { prisma } from "../infrastructure/db/PrismaClient";
import type { RecruiterSignal } from "../domain/entities/ProfileAudit";

export interface SignalSummary {
  totalAudits: number;
  latestScore: number;
  topContractAttractors: RecruiterSignal[];
  topLocationAttractors: RecruiterSignal[];
  positiveSignals: RecruiterSignal[];
  averageScore: number;
}

// Aggregates signal data across all audits to surface patterns over time.
// Useful for tracking whether profile changes are improving the score.
export class AnalyzeSignalsUseCase {
  async getSummary(): Promise<SignalSummary> {
    const audits = await prisma.profileAudit.findMany({
      include: { signals: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (audits.length === 0) {
      return {
        totalAudits: 0,
        latestScore: 0,
        topContractAttractors: [],
        topLocationAttractors: [],
        positiveSignals: [],
        averageScore: 0,
      };
    }

    const allSignals = audits.flatMap((a) => a.signals);
    const averageScore = Math.round(
      audits.reduce((sum, a) => sum + a.auditScore, 0) / audits.length
    );

    return {
      totalAudits: audits.length,
      latestScore: audits[0].auditScore,
      averageScore,
      topContractAttractors: allSignals
        .filter((s) => s.type === "contract_attractor" && s.severity === "high")
        .slice(0, 5)
        .map((s) => ({ text: s.text, type: s.type as RecruiterSignal["type"], severity: s.severity as RecruiterSignal["severity"] })),
      topLocationAttractors: allSignals
        .filter((s) => s.type === "location_attractor")
        .slice(0, 5)
        .map((s) => ({ text: s.text, type: s.type as RecruiterSignal["type"], severity: s.severity as RecruiterSignal["severity"] })),
      positiveSignals: allSignals
        .filter((s) => s.type === "positive")
        .slice(0, 5)
        .map((s) => ({ text: s.text, type: s.type as RecruiterSignal["type"], severity: s.severity as RecruiterSignal["severity"] })),
    };
  }
}
