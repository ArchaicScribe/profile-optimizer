import { NextRequest } from "next/server";
import { prisma } from "../../../../infrastructure/db/PrismaClient";

export const runtime = "nodejs";

// GET /api/audit/diagnose
// Returns diagnostic information about audit data in the database.
// Useful for debugging and verifying audit persistence.
export async function GET(_req: NextRequest) {
  try {
    const [auditCount, signalCount, recCount] = await Promise.all([
      prisma.profileAudit.count(),
      prisma.signal.count(),
      prisma.recommendation.count(),
    ]);

    const latest = await prisma.profileAudit.findFirst({
      orderBy: { createdAt: "desc" },
      include: { signals: true, recs: true },
    });

    return Response.json({
      ok: true,
      counts: { audits: auditCount, signals: signalCount, recommendations: recCount },
      latest: latest
        ? {
            id: latest.id,
            source: latest.source,
            auditScore: latest.auditScore,
            createdAt: latest.createdAt,
            signalCount: latest.signals.length,
            recCount: latest.recs.length,
          }
        : null,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
