import { NextRequest } from "next/server";
import { prisma } from "../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getGoalsContext } from "../../../infrastructure/db/getUserConfig";
import { extractJson } from "../../../lib/extractJson";

export const runtime = "nodejs";
export const maxDuration = 90;

function buildSystemPrompt(goalsContext: string): string {
  return `You are a senior Solutions Engineering interview coach with deep expertise in:
- System design at scale (distributed systems, data platforms, cloud-native architecture)
- AWS and Azure services in depth: compute, storage, networking, data, security, observability
- Pre-sales and solutions architecture scenarios - customer-facing trade-off discussions
- SQL and database design for enterprise and analytical workloads
- AI/ML concepts, MLOps, and applied AI for platform companies
- Company-specific interview cultures at Amazon, Microsoft, Google, Snowflake, Databricks, Salesforce, and similar

${goalsContext}

Your job is to produce a structured interview prep guide tailored to SE/SA/CA/CE roles at top-tier tech companies.
Weight questions toward:
- System design and architecture trade-offs (the core of SE/SA/CA interviews)
- AWS and Azure service selection, comparison, and integration patterns
- Cloud architecture best practices: multi-region, cost optimization, security, observability
- Pre-sales technical scenarios: customer architecture reviews, proof-of-concept scoping, migration planning
- Customer-facing communication: explaining trade-offs to non-technical stakeholders
DSA questions should reflect what SE/SA interviews actually test - not pure LeetCode grind.
Be specific, practical, and opinionated. Include real problem types, not vague advice.
Do not use em-dashes. Return valid JSON only.`;
}

// GET /api/study — list all saved guides
export async function GET() {
  try {
    const guides = await prisma.studyGuide.findMany({
      orderBy: { createdAt: "desc" },
      include: { questions: { select: { id: true, status: true } } },
    });

    const summary = guides.map((g) => ({
      id: g.id,
      createdAt: g.createdAt,
      jobTitle: g.jobTitle,
      company: g.company,
      totalQuestions: g.questions.length,
      gotIt: g.questions.filter((q) => q.status === "got_it").length,
      struggled: g.questions.filter((q) => q.status === "struggled").length,
    }));

    return Response.json({ guides: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load guides";
    return Response.json({ error: message }, { status: 500 });
  }
}

// POST /api/study — generate a new study guide
// Body: { jobTitle: string, company: string, jdSummary?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobTitle, company, jdSummary } = body as {
      jobTitle: string;
      company: string;
      jdSummary?: string;
    };

    if (!jobTitle || !company) {
      return Response.json({ error: "jobTitle and company are required." }, { status: 400 });
    }

    const { config, goalsContext } = await getGoalsContext();
    const systemPrompt = buildSystemPrompt(goalsContext);

    const userMessage = `Generate a comprehensive interview prep guide for the following role.

Job Title: ${jobTitle}
Company: ${company}
${jdSummary ? `Job context: ${jdSummary}` : ""}
Candidate background: ${config.keyBackground}

Return a JSON object with this exact structure:
{
  "sections": [
    {
      "category": "dsa",
      "title": "Data Structures & Algorithms",
      "questions": [
        {
          "topic": string,
          "difficulty": "easy" | "medium" | "hard",
          "prompt": string (the actual interview question, 1-3 sentences),
          "hints": [string, string, string] (3 progressive hints, from subtle to direct)
        }
      ]
    },
    { "category": "system_design", "title": "System Design", "questions": [...] },
    { "category": "sql", "title": "SQL & Databases", "questions": [...] },
    { "category": "ai_ml", "title": "AI & Machine Learning", "questions": [...] },
    { "category": "company_specific", "title": "Company-Specific", "questions": [...] }
  ]
}

Requirements:
- 5-7 questions per section (fewer for sql and ai_ml if not relevant to the role)
- DSA: focus on patterns SE/SA/CA interviews actually test at ${company} - graph/tree problems, SQL-adjacent, moderate complexity. No pure competitive programming.
- System design: real architecture scenarios at ${company}'s scale. At least 2 questions must involve AWS or Azure services specifically. Cover multi-region, data pipelines, distributed ingestion, API design, reliability trade-offs.
- SQL: practical problems (window functions, complex joins, query optimization, schema design for analytical workloads)
- AI/ML: ML system design, feature engineering, model deployment, applied AI for ${company}'s product domain
- Company-specific: SE/SA/CA behavioral questions tied to ${company}'s values, customer scenario walkthroughs, architecture review simulations, known patterns for their interview loop
- Tailor ALL questions to the SE/SA/CA/CE role - customer-facing scenarios, architecting for others, trade-off justification to non-technical stakeholders
- Weave AWS and Azure into system design and company-specific questions wherever realistic
- Make prompts feel like real interview questions, not textbook definitions`;

    const claude = ClaudeClient.getInstance();

    const parsed = extractJson<{ sections: Array<{
      category: string;
      questions: Array<{ topic: string; difficulty: string; prompt: string; hints: string[] }>;
    }> }>(await claude.complete(systemPrompt, userMessage));

    const guide = await prisma.studyGuide.create({
      data: {
        jobTitle,
        company,
        jdSummary: jdSummary ?? null,
        questions: {
          create: (parsed.sections ?? []).flatMap((section) =>
            (section.questions ?? []).map((q) => ({
              category: section.category,
              difficulty: q.difficulty,
              topic: q.topic,
              prompt: q.prompt,
              hints: JSON.stringify(q.hints ?? []),
            })),
          ),
        },
      },
      include: { questions: true },
    });

    return Response.json({ guide });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Guide generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
