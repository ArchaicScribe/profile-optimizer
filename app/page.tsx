"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, ScanSearch, TrendingUp, AlertTriangle, MapPin, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { SignalSummary } from "../application/AnalyzeSignalsUseCase";

// SVG circular score ring
function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75 ? "oklch(0.6 0.2 145)" : score >= 50 ? "oklch(0.75 0.18 80)" : "oklch(0.65 0.22 25)";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">score</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 rounded-full bg-muted animate-pulse" style={{ width: `${70 + i * 8}%` }} />
        ))}
      </CardContent>
    </Card>
  );
}

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default function Dashboard() {
  const [summary, setSummary] = useState<SignalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/signals")
      .then((r) => r.json())
      .then((data) => { setSummary(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.6_0.2_280/30%)] bg-[oklch(0.6_0.2_280/8%)] px-3 py-1 text-xs text-[oklch(0.7_0.15_280)] font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[oklch(0.6_0.2_280)] animate-pulse" />
          AI-powered recruiter signal analysis
        </div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Profile Optimizer
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-lg">
          Audit your LinkedIn profile, identify signals attracting the wrong recruiters,
          and surface direct-hire roles at well-established companies.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/audit">
          <Card className="card-hover cursor-pointer h-full border-border/60 bg-card/60">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[oklch(0.6_0.2_280/12%)] border border-[oklch(0.6_0.2_280/25%)] text-[oklch(0.65_0.18_280)] mb-2">
                <FileSearch size={18} />
              </div>
              <CardTitle className="text-base">Audit Profile</CardTitle>
              <CardDescription>
                Upload your LinkedIn export or enter a URL to analyze recruiter signals and get AI recommendations.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/jobs">
          <Card className="card-hover cursor-pointer h-full border-border/60 bg-card/60">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[oklch(0.55_0.18_145/12%)] border border-[oklch(0.55_0.18_145/25%)] text-[oklch(0.6_0.18_145)] mb-2">
                <ScanSearch size={18} />
              </div>
              <CardTitle className="text-base">Scan Jobs</CardTitle>
              <CardDescription>
                Search Indeed, Levels.fyi, and Dice for direct-hire roles at well-established companies.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Separator className="opacity-50" />

      {/* Signal summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Signal Overview
          </h2>
          {summary && summary.totalAudits > 0 && (
            <Link href="/audit" className="text-xs text-[oklch(0.65_0.15_280)] hover:underline underline-offset-2">
              Run new audit →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !summary || summary.totalAudits === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/40">
            <CardContent className="pt-10 pb-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No audits yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run your first profile audit to see signal analysis here.
                </p>
              </div>
              <Link
                href="/audit"
                className="mt-1 rounded-md bg-foreground text-background px-4 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Run Audit
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score card */}
            <Card className="border-border/60 bg-card/60 flex flex-col items-center justify-center py-6 gap-4">
              <CardContent className="flex flex-col items-center gap-4 pt-0">
                <ScoreRing score={summary.latestScore} />
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avg (last {summary.totalAudits})</span>
                    <span>{summary.averageScore}</span>
                  </div>
                  <Progress value={summary.averageScore} className="h-1" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalAudits} audit{summary.totalAudits !== 1 ? "s" : ""} run
                </p>
              </CardContent>
            </Card>

            {/* Contract attractors */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-destructive" />
                  <CardTitle className="text-sm">Contract Attractors</CardTitle>
                </div>
                <CardDescription className="text-xs">Signals drawing contract recruiters</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.topContractAttractors.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    None detected
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {summary.topContractAttractors.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant={SEVERITY_VARIANT[s.severity]} className="mt-0.5 shrink-0 text-xs">
                          {s.severity}
                        </Badge>
                        <span className="text-xs leading-relaxed">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Location signals */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <CardTitle className="text-sm">Location Signals</CardTitle>
                </div>
                <CardDescription className="text-xs">Geographic signals in your profile</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.topLocationAttractors.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    None detected
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {summary.topLocationAttractors.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">
                          {s.severity}
                        </Badge>
                        <span className="text-xs leading-relaxed">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Phrases to Avoid */}
          {summary.phrasesToAvoid.length > 0 && (
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-destructive" />
                    <CardTitle className="text-sm">Phrases to Avoid</CardTitle>
                  </div>
                  <Link href="/audit" className="text-xs text-[oklch(0.65_0.15_280)] hover:underline underline-offset-2">
                    Full report
                  </Link>
                </div>
                <CardDescription className="text-xs">Words and phrases that attract the wrong recruiters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.phrasesToAvoid.map((p, i) => {
                    const pill =
                      p.context === "staffing_agency"
                        ? "border-destructive/40 text-destructive bg-destructive/5"
                        : p.context === "geographic"
                        ? "border-yellow-500/40 text-yellow-500 bg-yellow-500/5"
                        : "border-border text-muted-foreground bg-muted/30";
                    return (
                      <span
                        key={i}
                        title={p.reason}
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono cursor-default ${pill}`}
                      >
                        {p.phrase}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
