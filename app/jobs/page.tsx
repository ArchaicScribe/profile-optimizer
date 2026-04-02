"use client";

import { useEffect, useState } from "react";
import { Loader2, SearchX, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobMatch, JobBoard, ScanPreferences } from "../../domain/entities/JobMatch";

const BOARD_LABELS: Record<JobBoard, string> = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
  levels: "Levels.fyi",
  dice: "Dice",
};

const BOARD_COLORS: Record<JobBoard, string> = {
  indeed: "oklch(0.6 0.18 250)",
  linkedin: "oklch(0.55 0.18 230)",
  levels: "oklch(0.6 0.18 145)",
  dice: "oklch(0.6 0.18 30)",
};

const DEFAULT_PREFS: ScanPreferences = {
  locations: ["Seattle", "Boston", "Remote"],
  excludeLocations: ["Albuquerque", "New Mexico", "NM"],
  roleKeywords: ["Senior Software Engineer", "Staff Software Engineer"],
  excludeKeywords: ["contract", "C2C", "corp to corp", "1099"],
  directHireOnly: true,
  boards: ["indeed", "levels", "dice"],
};

function ScorePill({ score }: { score: number }) {
  const color = score >= 75 ? "text-green-500 bg-green-500/10 border-green-500/20"
    : score >= 50 ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
    : "text-muted-foreground bg-muted border-border";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-6 rounded-full border text-xs font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

export default function JobsPage() {
  const [prefs, setPrefs] = useState<ScanPreferences>(DEFAULT_PREFS);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => setLinkedinEnabled(cfg.linkedinEnabled === true))
      .catch(() => {});
  }, []);

  const handleBoardToggle = (board: JobBoard) => {
    setPrefs((p) => ({
      ...p,
      boards: p.boards.includes(board)
        ? p.boards.filter((b) => b !== board)
        : [...p.boards, board],
    }));
  };

  const runScan = async () => {
    setError(null);
    setScanning(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setJobs(data.jobs ?? []);
      setHasScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const allBoards: JobBoard[] = ["indeed", "levels", "dice", "linkedin"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Job Scanner</h1>
        <p className="mt-1.5 text-muted-foreground">
          Scan job boards for direct-hire roles at well-established companies.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Target Locations", key: "locations" as const, placeholder: "Seattle, Boston, Remote" },
              { label: "Exclude Locations", key: "excludeLocations" as const, placeholder: "Albuquerque, New Mexico" },
              { label: "Role Keywords", key: "roleKeywords" as const, placeholder: "Senior Software Engineer" },
              { label: "Exclude Keywords", key: "excludeKeywords" as const, placeholder: "contract, C2C, 1099" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium">{label}</label>
                <input
                  type="text"
                  value={prefs[key].join(", ")}
                  onChange={(e) => setPrefs((p) => ({
                    ...p,
                    [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
                />
              </div>
            ))}
          </div>

          {/* Board toggles */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Job Boards</label>
            <div className="flex flex-wrap gap-2">
              {allBoards.map((board) => {
                const locked = board === "linkedin" && !linkedinEnabled;
                const active = prefs.boards.includes(board);
                return (
                  <button key={board} disabled={locked}
                    onClick={() => !locked && handleBoardToggle(board)}
                    title={locked ? "Set ENABLE_LINKEDIN_SCRAPER=true in .env to enable" : undefined}
                    className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-all duration-150 ${
                      locked
                        ? "border-border/40 text-muted-foreground/30 cursor-not-allowed"
                        : active
                        ? "border-transparent text-white shadow-sm"
                        : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                    }`}
                    style={active && !locked ? { backgroundColor: BOARD_COLORS[board] } : undefined}
                  >
                    {BOARD_LABELS[board]}{locked && " (opt-in)"}
                  </button>
                );
              })}
            </div>
            {!linkedinEnabled && (
              <p className="text-xs text-muted-foreground">
                LinkedIn Jobs requires <code className="font-mono">ENABLE_LINKEDIN_SCRAPER=true</code> — see README.
              </p>
            )}
          </div>

          {/* Direct hire toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
            <div
              onClick={() => setPrefs((p) => ({ ...p, directHireOnly: !p.directHireOnly }))}
              className={`relative w-10 h-5.5 rounded-full border transition-colors duration-200 ${
                prefs.directHireOnly
                  ? "bg-[oklch(0.6_0.2_280)] border-[oklch(0.6_0.2_280)]"
                  : "bg-muted border-border"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                prefs.directHireOnly ? "translate-x-4.5" : "translate-x-0"
              }`} />
            </div>
            <span className="text-sm">Direct hire only</span>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <Loader2 size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button onClick={runScan} disabled={scanning || prefs.boards.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-5 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors">
            {scanning ? <><Loader2 size={14} className="animate-spin" />Scanning...</> : "Scan Jobs"}
          </button>
        </CardContent>
      </Card>

      {hasScanned && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Results
            </h2>
            <span className="text-xs text-muted-foreground">
              {jobs.length} match{jobs.length !== 1 ? "es" : ""}
            </span>
          </div>

          {jobs.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/40">
              <CardContent className="pt-10 pb-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <SearchX size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try broadening your locations or role keywords.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 bg-card/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-16">Score</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Company</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="w-24">Board</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                      <TableCell><ScorePill score={job.matchScore} /></TableCell>
                      <TableCell>
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-[oklch(0.7_0.15_280)] transition-colors inline-flex items-center gap-1.5 group-hover:underline underline-offset-2">
                          {job.title}
                          <ExternalLink size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        </a>
                        {job.fitReason && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{job.fitReason}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{job.company}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{job.location}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                          {BOARD_LABELS[job.board]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
