import { NextRequest } from "next/server";
import { prisma } from "../../../infrastructure/db/PrismaClient";

export const runtime = "nodejs";

const DEFAULT_CONFIG = {
  targetRole: "Solutions Engineer / Solutions Architect / Customer Engineer",
  targetCompanies: ["Amazon", "Microsoft", "Google", "Snowflake", "Databricks", "Salesforce"],
  currentRole: "Senior Software Engineer",
  yearsExperience: 6,
  keyBackground:
    "Enterprise Java/Spring Boot modernization specialist with 6 years at large organizations. " +
    "Strong in distributed systems, cloud-native architecture (AWS/Azure/Kubernetes), " +
    "OAuth2/security, and production observability. Targeting SE/SA/CA roles at Seattle-area and top-tier tech companies.",
  avoidContext: "Do not emphasize government, federal, or clearance experience. Avoid contractor/staffing agency framing.",
  activeCert: "AI-102",
  certPath: ["AI-102", "AZ-305"],
  certNotes: "",
};

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
