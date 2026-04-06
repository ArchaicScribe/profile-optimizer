"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, TrendingUp, AlertTriangle, Clock, ChevronRight, Library, Plus, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface GuideSummary {
  id: string;
  createdAt: string;
  jobTitle: string;
  company: string;
  totalQuestions: number;
  gotIt: number;
  struggled: number;
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

function NewGuideForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jdText, setJdText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!jobTitle.trim() || !company.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          jdSummary: jdText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onCreated(data.guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-3 py-2 text-xs font-medium hover:bg-[oklch(0.55_0.2_280)] transition-colors"
      >
        <Plus size={13} /> New Guide
      </button>
    );
  }

  return (
    <Card className="border-[oklch(0.6_0.2_280/30%)] bg-card/80 w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">New Study Guide</CardTitle>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <CardDescription>Enter a role and company - paste the JD for more targeted questions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Job title</label>
            <input
              type="text"
              placeholder="e.g. Solutions Architect"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Company</label>
            <input
              type="text"
              placeholder="e.g. Amazon"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">
            Job description <span className="text-muted-foreground font-normal">(optional - paste for tailored questions)</span>
          </label>
          <textarea
            rows={4}
            placeholder="Paste the full JD here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow"
          />
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={generate}
            disabled={generating || !jobTitle.trim() || !company.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-4 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
          >
            {generating ? <><Loader2 size={13} className="animate-spin" />Generating guide...</> : "Generate Guide"}
          </button>
          {generating && (
            <span className="text-xs text-muted-foreground">This takes 20-30 seconds</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PrepPage() {
  const router = useRouter();
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/study")
      .then((r) => r.json())
      .then((data) => { setGuides(data.guides ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Interview Prep</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your saved study guides. Open any guide to practice questions and chat with the AI tutor.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/prep/bank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.6_0.2_280/40%)] text-[oklch(0.7_0.15_280)] px-3 py-2 text-xs font-medium hover:bg-[oklch(0.6_0.2_280/8%)] transition-colors"
          >
            <Library size={13} /> Question Bank
          </Link>
          <NewGuideForm onCreated={(id) => router.push(`/prep/${id}`)} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                {[...Array(3)].map((__, j) => (
                  <div key={j} className="h-3 rounded-full bg-muted animate-pulse" style={{ width: `${60 + j * 15}%` }} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : guides.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <BookOpen size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No study guides yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "New Guide" above to generate your first guide, or find a job on the Jobs page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guides.map((g) => {
            const reviewed = g.gotIt + g.struggled;
            const pct = g.totalQuestions > 0 ? (reviewed / g.totalQuestions) * 100 : 0;
            const ringColor = g.struggled > 0 ? "oklch(0.65 0.22 25)" : pct >= 80 ? "oklch(0.6 0.2 145)" : "oklch(0.6 0.2 280)";
            const date = new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            return (
              <Link key={g.id} href={`/prep/${g.id}`}>
                <Card className="card-hover cursor-pointer h-full border-border/60 bg-card/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{g.jobTitle}</CardTitle>
                        <CardDescription className="text-sm mt-0.5">{g.company}</CardDescription>
                      </div>
                      <ProgressRing pct={pct} color={ringColor} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <Progress value={pct} className="h-1" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <TrendingUp size={11} className="text-green-500" />
                          {g.gotIt} got it
                        </span>
                        {g.struggled > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle size={11} className="text-destructive" />
                            {g.struggled} struggled
                          </span>
                        )}
                        <span>{g.totalQuestions} total</span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {date}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {g.struggled > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {g.struggled} to review
                        </Badge>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-xs text-[oklch(0.65_0.15_280)]">
                        Open guide <ChevronRight size={12} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
