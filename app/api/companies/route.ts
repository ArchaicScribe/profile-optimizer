import { NextRequest } from "next/server";
import { prisma } from "../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { extractJson } from "../../../lib/extractJson";

export const runtime = "nodejs";
export const maxDuration = 90;

// GET /api/companies — return all generated company cards
export async function GET() {
  try {
    const records = await prisma.companyCard.findMany({
      orderBy: { company: "asc" },
    });

    const cards = records.map((r) => ({
      id: r.id,
      company: r.company,
      createdAt: r.createdAt,
      rawData: JSON.parse(r.rawData),
    }));

    return Response.json({ cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load company cards";
    return Response.json({ error: message }, { status: 500 });
  }
}

// POST /api/companies — generate and save a research card for a company
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company } = body as { company: string };

    if (!company || typeof company !== "string" || company.trim() === "") {
      return Response.json({ error: "company is required" }, { status: 400 });
    }

    const trimmedCompany = company.trim();
    const config = await getUserConfig();
    const goalsContext = buildGoalsContext(config);

    const systemPrompt = `You are a senior SE/SA/CA career coach with insider knowledge of how top tech companies hire for customer-facing technical roles (Solutions Engineer, Solutions Architect, Customer Engineer, Customer Architect, Partner Architect).

${goalsContext}

You know exactly how these interview loops work, what signals get candidates through, and what kills candidacies. Be specific and opinionated. No generic career advice.
Do not use em-dashes. Return valid JSON only.`;

    const userMessage = `Generate a comprehensive interview research card for SE/SA/CA/CE roles at ${trimmedCompany}.

Return JSON with this exact structure:
{
  "company": string,
  "roles": [string],
  "loopStructure": [
    { "round": string, "format": string, "focus": string, "duration": string }
  ],
  "keySignals": [string],
  "knownPatterns": [string],
  "techStack": [string],
  "whatGoodLooksLike": string,
  "redFlags": [string],
  "insiderTips": [string],
  "cloudFocus": string
}

Be specific to ${trimmedCompany}. Do not give generic SE/SA interview advice.`;

    const claude = ClaudeClient.getInstance();

    let fullOutput = "";
    for await (const chunk of claude.streamText(systemPrompt, userMessage)) {
      fullOutput += chunk;
    }

    const parsed = extractJson(fullOutput);

    const saved = await prisma.companyCard.upsert({
      where: { company: trimmedCompany },
      create: { company: trimmedCompany, rawData: JSON.stringify(parsed) },
      update: { rawData: JSON.stringify(parsed) },
    });

    return Response.json({
      id: saved.id,
      company: saved.company,
      createdAt: saved.createdAt,
      rawData: JSON.parse(saved.rawData),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate company card";
    return Response.json({ error: message }, { status: 500 });
  }
}
