import { NextRequest } from "next/server";
import { prisma } from "../../../infrastructure/db/PrismaClient";
import { ClaudeClient } from "../../../infrastructure/ai/ClaudeClient";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM_PROMPT = `You are a senior staff engineer and interview coach with deep knowledge of:
- Data structures and algorithms (LeetCode-style problems)
- Large-scale system design
- SQL and database design
- AI/ML concepts and applications
- Company-specific interview cultures and question patterns

Your job is to produce a structured interview prep guide tailored to a specific job and company.
Be specific, practical, and opinionated. Include real problem types, not vague advice.
Do not use em-dashes. Return valid JSON only.`;

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

    const claude = ClaudeClient.getInstance();

    const userMessage = `Generate a comprehensive interview prep guide for the following role.

Job Title: ${jobTitle}
Company: ${company}
${jdSummary ? `Job context: ${jdSummary}` : ""}

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
- DSA: focus on patterns this company is known to ask (arrays, graphs, DP, etc.)
- System design: real scenarios relevant to this company's scale and product domain
- SQL: practical database problems (window functions, complex joins, query optimization)
- AI/ML: concepts, ML system design, and applied AI questions relevant to the role
- Company-specific: behavioral questions tied to the company's values/culture, plus any known question patterns
- Make prompts feel like real interview questions, not textbook definitions`;

    let accumulated = "";
    for await (const chunk of claude.streamText(SYSTEM_PROMPT, userMessage)) {
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
