"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, Search, SlidersHorizontal, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AttemptStat {
  totalAttempts: number;
  struggledCount: number;
  gotItCount: number;
  avgScore: number | null;
  lastAttemptAt: string | null;
  lastAttemptStatus: "got_it" | "struggled" | null;
}

interface BankQuestion {
  id: string;
  guideId: string;
  guide: { id: string; jobTitle: string; company: string };
  category: string;
  difficulty: string;
  topic: string;
  prompt: string;
  status: "unanswered" | "got_it" | "struggled";
  reviewCount: number;
  lastReviewedAt: string | null;
  stats: AttemptStat;
}

const CATEGORY_LABELS: Record<string, string> = {
  dsa: "DSA",
  system_design: "System Design",
  sql: "SQL",
  ai_ml: "AI / ML",
  company_specific: "Company",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-green-500 border-green-500/30 bg-green-500/5",
  medium: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5",
  hard: "text-destructive border-destructive/30 bg-destructive/5",
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "text-green-500 bg-green-500/10 border-green-500/20"
    : score >= 50 ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
    : "text-destructive bg-destructive/10 border-destructive/20";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

function BankQuestionRow({ q }: { q: BankQuestion }) {
  const [expanded, setExpanded] = useState(false);

  const borderClass =
    q.status === "got_it" ? "border-green-500/25"
    : q.status === "struggled" ? "border-destructive/35"
    : "border-border/60";

  const bgClass =
    q.status === "struggled" ? "bg-destructive/3" : "bg-card/60";

  const lastDate = q.stats.lastAttemptAt
    ? new Date(q.stats.lastAttemptAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <Card className={`${borderClass} ${bgClass} transition-all duration-200`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 mt-0.5">
            {q.status === "got_it"
              ? <CheckCircle2 size={14} className="text-green-500" />
              : q.status === "struggled"
              ? <AlertTriangle size={14} className="text-destructive" />
              : <div className="w-3.5 h-3.5 rounded-full border-2 border-border mt-0.5" />
            }
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${DIFFICULTY_COLOR[q.difficulty] ?? ""}`}>
                {q.difficulty}
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {CATEGORY_LABELS[q.category] ?? q.category}
              </Badge>
              <span className="text-xs text-muted-foreground">{q.topic}</span>
            </div>
            <p className="text-sm font-medium leading-snug">{q.prompt}</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{q.guide.company} - {q.guide.jobTitle}</span>
              {q.stats.totalAttempts > 0 && (
                <>
                  <span>{q.stats.totalAttempts} attempt{q.stats.totalAttempts !== 1 ? "s" : ""}</span>
                  {q.stats.avgScore !== null && <ScoreBadge score={q.stats.avgScore} />}
                  {lastDate && <span>Last: {lastDate}</span>}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 mt-0.5">
          {q.stats.struggledCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
              <TrendingDown size={10} /> {q.stats.struggledCount}
            </span>
          )}
          {q.stats.gotItCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-green-500">
              <TrendingUp size={10} /> {q.stats.gotItCount}
            </span>
          )}
          {expanded ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          <Separator className="opacity-40" />
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/prep/${q.guideId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.6_0.2_280/40%)] text-[oklch(0.7_0.15_280)] px-3 py-1.5 text-xs font-medium hover:bg-[oklch(0.6_0.2_280/8%)] transition-colors"
            >
              Open in guide
            </Link>
            <span className="text-xs text-muted-foreground">
              {q.guide.company} &middot; {q.guide.jobTitle}
            </span>
          </div>

          {q.stats.totalAttempts > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Attempts", value: q.stats.totalAttempts },
                { label: "Got it", value: q.stats.gotItCount, color: "text-green-500" },
                { label: "Struggled", value: q.stats.struggledCount, color: "text-destructive" },
                { label: "Avg score", value: q.stats.avgScore !== null ? `${q.stats.avgScore}` : "n/a" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-center">
                  <p className={`text-sm font-bold tabular-nums ${color ?? ""}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {q.stats.totalAttempts === 0 && (
            <p className="text-xs text-muted-foreground">No attempts recorded yet. Open the guide to start practicing.</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function BankPage() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCompany, setFilterCompany] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterCategory) params.set("category", filterCategory);
    if (filterDifficulty) params.set("difficulty", filterDifficulty);
    if (filterStatus) params.set("status", filterStatus);
    if (filterCompany) params.set("company", filterCompany);

    fetch(`/api/study/bank?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setQuestions(d.questions ?? []);
        setCompanies(d.companies ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filterCategory, filterDifficulty, filterStatus, filterCompany]);

  useEffect(() => { load(); }, [load]);

  const struggled = questions.filter((q) => q.status === "struggled");
  const unanswered = questions.filter((q) => q.status === "unanswered");
  const gotIt = questions.filter((q) => q.status === "got_it");
  const sorted = [...struggled, ...unanswered, ...gotIt];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Question Bank</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          All questions across every guide. Struggled questions surface first.
        </p>
      </div>

      {/* Stats strip */}
      {!loading && questions.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{questions.length} questions</span>
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle size={11} /> {struggled.length} struggling
          </span>
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle2 size={11} /> {gotIt.length} mastered
          </span>
          <span>{unanswered.length} not yet attempted</span>
        </div>
      )}

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions by topic or keyword..."
              className="w-full rounded-lg border border-input bg-background/50 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              showFilters || filterCategory || filterDifficulty || filterStatus || filterCompany
                ? "border-[oklch(0.6_0.2_280/50%)] text-[oklch(0.7_0.15_280)] bg-[oklch(0.6_0.2_280/8%)]"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal size={13} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                label: "Category", value: filterCategory, setter: setFilterCategory,
                options: [["", "All categories"], ...Object.entries(CATEGORY_LABELS)],
              },
              {
                label: "Difficulty", value: filterDifficulty, setter: setFilterDifficulty,
                options: [["", "All difficulties"], ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]],
              },
              {
                label: "Status", value: filterStatus, setter: setFilterStatus,
                options: [["", "All statuses"], ["unanswered", "Not attempted"], ["struggled", "Struggled"], ["got_it", "Got it"]],
              },
              {
                label: "Company", value: filterCompany, setter: setFilterCompany,
                options: [["", "All companies"], ...companies.map((c) => [c, c])],
              },
            ].map(({ label, value, setter, options }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <select
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
                >
                  {(options as [string, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-3 text-center">
            <CardTitle className="text-sm font-medium">No questions found</CardTitle>
            <CardDescription className="text-xs">
              {questions.length === 0
                ? "Generate a study guide from the Job Scanner to start building your question bank."
                : "Try adjusting your filters."
              }
            </CardDescription>
            {questions.length === 0 && (
              <Link
                href="/jobs"
                className="mt-1 rounded-md bg-foreground text-background px-4 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Go to Job Scanner
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((q) => <BankQuestionRow key={q.id} q={q} />)}
        </div>
      )}
    </div>
  );
}
