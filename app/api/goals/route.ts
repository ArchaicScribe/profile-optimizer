import { NextRequest } from "next/server";
import { prisma } from "../../../infrastructure/db/PrismaClient";
import { DEFAULTS } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";

const DEFAULT_CONFIG = { ...DEFAULTS, certNotes: "" };

// GET /api/goals - return current user config
export async function GET() {
  try {
    let config = await prisma.userConfig.findUnique({ where: { id: "singleton" } });

    if (!config) {
      config = await prisma.userConfig.create({
        data: {
          id: "singleton",
          ...DEFAULT_CONFIG,
          targetCompanies: JSON.stringify(DEFAULT_CONFIG.targetCompanies),
          certPath: JSON.stringify(DEFAULT_CONFIG.certPath),
        },
      });
    }

    return Response.json({
      ...config,
      targetCompanies: JSON.parse(config.targetCompanies),
      certPath: JSON.parse(config.certPath || "[]"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load config";
    return Response.json({ error: message }, { status: 500 });
  }
}

// PUT /api/goals - update user config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetRole,
      targetCompanies,
      currentRole,
      yearsExperience,
      keyBackground,
      avoidContext,
      activeCert,
      certPath,
      certNotes,
    } = body;

    const config = await prisma.userConfig.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        targetRole: targetRole ?? DEFAULT_CONFIG.targetRole,
        targetCompanies: JSON.stringify(targetCompanies ?? DEFAULT_CONFIG.targetCompanies),
        currentRole: currentRole ?? DEFAULT_CONFIG.currentRole,
        yearsExperience: yearsExperience ?? DEFAULT_CONFIG.yearsExperience,
        keyBackground: keyBackground ?? DEFAULT_CONFIG.keyBackground,
        avoidContext: avoidContext ?? DEFAULT_CONFIG.avoidContext,
        activeCert: activeCert ?? DEFAULT_CONFIG.activeCert,
        certPath: JSON.stringify(certPath ?? DEFAULT_CONFIG.certPath),
        certNotes: certNotes ?? DEFAULT_CONFIG.certNotes,
      },
      update: {
        ...(targetRole !== undefined && { targetRole }),
        ...(targetCompanies !== undefined && { targetCompanies: JSON.stringify(targetCompanies) }),
        ...(currentRole !== undefined && { currentRole }),
        ...(yearsExperience !== undefined && { yearsExperience }),
        ...(keyBackground !== undefined && { keyBackground }),
        ...(avoidContext !== undefined && { avoidContext }),
        ...(activeCert !== undefined && { activeCert }),
        ...(certPath !== undefined && { certPath: JSON.stringify(certPath) }),
        ...(certNotes !== undefined && { certNotes }),
      },
    });

    return Response.json({
      ...config,
      targetCompanies: JSON.parse(config.targetCompanies),
      certPath: JSON.parse(config.certPath || "[]"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save config";
    return Response.json({ error: message }, { status: 500 });
  }
}
