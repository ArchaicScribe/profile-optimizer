import { NextRequest } from "next/server";
import { prisma } from "../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 90;

// GET /api/companies - return all generated company cards
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

// POST /api/companies - generate and save a research card for a company
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
  "roles": [string],  // exact job titles used at this company for SE/SA/CA/CE (e.g. "Solutions Architect", "Customer Engineer")
  "loopStructure": [
    { "round": string, "format": string, "focus": string, "duration": string }
  ],
  "keySignals": [string],  // 5-7 things this company specifically looks for in SE/SA/CA candidates
  "knownPatterns": [string],  // 5-7 known question patterns or topics that appear in their loops
  "techStack": [string],  // relevant AWS/Azure/GCP services and tools that come up in their SE/SA interviews
  "whatGoodLooksLike": string,  // paragraph: what an ideal candidate answer/profile looks like to their hiring bar
  "redFlags": [string],  // 4-5 things that kill SE/SA/CA candidacy at this company specifically
  "insiderTips": [string],  // 4-5 specific, actionable prep tips for this company's loop
  "cloudFocus": string  // "AWS" | "Azure" | "GCP" | "Multi-cloud" | "Agnostic" - which cloud matters most for their SE/SA interviews
}

Be specific to ${trimmedCompany}. Do not give generic SE/SA interview advice.`;

    const claude = ClaudeClient.getInstance();

    let fullOutput = "";
    for await (const chunk of claude.streamText(systemPrompt, userMessage)) {
      fullOutput += chunk;
    }

    // Strip markdown code fences if present
    const cleaned = fullOutput
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const saved = await prisma.companyCard.upsert({
      where: { company: trimmedCompany },
      create: {
        company: trimmedCompany,
        rawData: JSON.stringify(parsed),
      },
      update: {
        rawData: JSON.stringify(parsed),
      },
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
