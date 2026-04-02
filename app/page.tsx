"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { SignalSummary } from "../application/AnalyzeSignalsUseCase";

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 75
      ? "text-green-500"
      : score >= 50
      ? "text-yellow-500"
      : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-5xl font-bold tabular-nums ${color}`}>{score}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-widest">
        Recruiter Score
      </span>
    </div>
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
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Profile optimization and job signal overview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/audit">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base">Audit Profile</CardTitle>
              <CardDescription>
                Upload your LinkedIn export or enter a URL to analyze recruiter
                signals.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/jobs">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base">Scan Jobs</CardTitle>
              <CardDescription>
                Search Indeed, Levels.fyi, LinkedIn, and Dice for direct-hire
                roles at well-established companies.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Separator />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading signal data...</p>
      ) : !summary || summary.totalAudits === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No audits yet.{" "}
              <Link href="/audit" className="underline underline-offset-2">
                Run your first audit
              </Link>{" "}
              to see signal analysis here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex items-center justify-center py-6">
            <CardContent className="flex flex-col items-center gap-4">
              <ScoreRing score={summary.latestScore} />
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Average (last 10)</span>
                  <span>{summary.averageScore}</span>
                </div>
                <Progress value={summary.averageScore} className="h-1.5" />
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.totalAudits} audit
                {summary.totalAudits !== 1 ? "s" : ""} run
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contract Attractors</CardTitle>
              <CardDescription className="text-xs">
                Signals drawing contract recruiters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.topContractAttractors.length === 0 ? (
                <p className="text-xs text-muted-foreground">None detected</p>
              ) : (
                <ul className="space-y-2">
                  {summary.topContractAttractors.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge
                        variant={SEVERITY_VARIANT[s.severity]}
                        className="mt-0.5 shrink-0 text-xs"
                      >
                        {s.severity}
                      </Badge>
                      <span className="text-xs">{s.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Location Signals</CardTitle>
              <CardDescription className="text-xs">
                Geographic signals in your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.topLocationAttractors.length === 0 ? (
                <p className="text-xs text-muted-foreground">None detected</p>
              ) : (
                <ul className="space-y-2">
                  {summary.topLocationAttractors.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="mt-0.5 shrink-0 text-xs"
                      >
                        {s.severity}
                      </Badge>
                      <span className="text-xs">{s.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
