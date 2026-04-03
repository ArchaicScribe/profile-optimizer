"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, TrendingUp, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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

export default function PrepPage() {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Interview Prep</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your saved study guides. Open any guide to practice questions and chat with the AI tutor.
        </p>
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
                Find a job on the Job Scanner page and click "Prep for Interview" to generate your first guide.
              </p>
            </div>
            <Link
              href="/jobs"
              className="mt-1 rounded-md bg-foreground text-background px-4 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Go to Job Scanner
            </Link>
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
