import { NextRequest } from "next/server";
import { prisma } from "../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";
import { getUserConfig, buildGoalsContext } from "../../../infrastructure/db/getUserConfig";

export const runtime = "nodejs";
export const maxDuration = 90;

function buildSystemPrompt(goalsContext: string): string {
  return `You are a senior staff engineer and Solutions Engineering interview coach with deep expertise in:
- System design at scale (distributed systems, data platforms, cloud architecture)
- Pre-sales and solutions architecture scenarios
- SQL and database design for enterprise workloads
- AI/ML concepts, MLOps, and applied AI for platform companies
- Company-specific interview cultures at FAANG, Snowflake, Databricks, Stripe, Datadog, and similar

${goalsContext}

Your job is to produce a structured interview prep guide tailored to SE/SA roles at top-tier tech companies.
Weight questions toward system design, architecture trade-offs, cloud platform depth, and pre-sales technical scenarios.
DSA should reflect what SE/SA interviews actually test (graph traversal, tree problems, SQL window functions) - not pure LeetCode grind.
Be specific, practical, and opinionated. Include real problem types, not vague advice.
Do not use em-dashes. Return valid JSON only.`;
}

// GET /api/study - list all saved guides
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

// POST /api/study - generate a new study guide
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

    const config = await getUserConfig();
    const goalsContext = buildGoalsContext(config);
    const systemPrompt = buildSystemPrompt(goalsContext);

    const claude = ClaudeClient.getInstance();

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
    {
      "category": "system_design",
      "title": "System Design",
      "questions": [...]
    },
    {
      "category": "sql",
      "title": "SQL & Databases",
      "questions": [...]
    },
    {
      "category": "ai_ml",
      "title": "AI & Machine Learning",
      "questions": [...]
    },
    {
      "category": "company_specific",
      "title": "Company-Specific",
      "questions": [...]
    }
  ]
}

Requirements:
- 5-7 questions per section (fewer for sql and ai_ml if not relevant to the role)
- DSA: focus on patterns SE/SA interviews actually test at ${company} - graph/tree problems, SQL-adjacent, moderate complexity. Avoid pure competitive programming grind.
- System design: real architecture scenarios at ${company}'s scale - data pipelines, multi-tenant SaaS, distributed ingestion, API design, reliability trade-offs
- SQL: practical problems (window functions, complex joins, query optimization, schema design for analytical workloads)
- AI/ML: ML system design, feature engineering, model deployment, applied AI for ${company}'s product domain
- Company-specific: SE/SA behavioral questions tied to ${company}'s values, customer scenario walkthroughs, known patterns for their interview loop
- Tailor all questions to the SE/SA role - emphasize architecting for others, customer-facing scenarios, trade-off justification
- Make prompts feel like real interview questions, not textbook definitions`;

    let accumulated = "";
    for await (const chunk of claude.streamText(systemPrompt, userMessage)) {
      accumulated += chunk;
    }

    const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Guide generation failed." }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Persist to DB
    const guide = await prisma.studyGuide.create({
      data: {
        jobTitle,
        company,
        jdSummary: jdSummary ?? null,
        questions: {
          create: (parsed.sections ?? []).flatMap((section: {
            category: string;
            questions: Array<{ topic: string; difficulty: string; prompt: string; hints: string[] }>;
          }) =>
            (section.questions ?? []).map((q) => ({
              category: section.category,
              difficulty: q.difficulty,
              topic: q.topic,
              prompt: q.prompt,
              hints: JSON.stringify(q.hints ?? []),
            }))
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
