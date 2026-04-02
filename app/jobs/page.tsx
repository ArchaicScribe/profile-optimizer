"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobMatch, JobBoard, ScanPreferences } from "../../domain/entities/JobMatch";

const BOARD_LABELS: Record<JobBoard, string> = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
  levels: "Levels.fyi",
  dice: "Dice",
};

const DEFAULT_PREFS: ScanPreferences = {
  locations: ["Seattle", "Boston", "Remote"],
  excludeLocations: ["Albuquerque", "New Mexico", "NM"],
  roleKeywords: ["Senior Software Engineer", "Staff Software Engineer"],
  excludeKeywords: ["contract", "C2C", "corp to corp", "1099"],
  directHireOnly: true,
  boards: ["indeed", "levels", "dice"],
};

function ScoreBadge({ score }: { score: number }) {
  const variant =
    score >= 75 ? "default" : score >= 50 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="tabular-nums">
      {score}
    </Badge>
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
        <h1 className="text-3xl font-bold tracking-tight">Job Scanner</h1>
        <p className="mt-1 text-muted-foreground">
          Scan job boards for direct-hire roles at well-established companies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Target Locations</label>
              <input
                type="text"
                value={prefs.locations.join(", ")}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    locations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Seattle, Boston, Remote"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Exclude Locations</label>
              <input
                type="text"
                value={prefs.excludeLocations.join(", ")}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    excludeLocations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Albuquerque, New Mexico"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Role Keywords</label>
              <input
                type="text"
                value={prefs.roleKeywords.join(", ")}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    roleKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Senior Software Engineer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Exclude Keywords</label>
              <input
                type="text"
                value={prefs.excludeKeywords.join(", ")}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    excludeKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="contract, C2C, 1099"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Job Boards</label>
            <div className="flex flex-wrap gap-2">
              {allBoards.map((board) => {
                const isLinkedIn = board === "linkedin";
                const locked = isLinkedIn && !linkedinEnabled;
                return (
                  <button
                    key={board}
                    onClick={() => !locked && handleBoardToggle(board)}
                    disabled={locked}
                    title={
                      locked
                        ? "LinkedIn scraping is disabled. Set ENABLE_LINKEDIN_SCRAPER=true in .env to opt in. See README for ToS implications."
                        : undefined
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      locked
                        ? "border-border text-muted-foreground/40 cursor-not-allowed"
                        : prefs.boards.includes(board)
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {BOARD_LABELS[board]}
                    {locked && " (opt-in)"}
                  </button>
                );
              })}
            </div>
            {!linkedinEnabled && (
              <p className="text-xs text-muted-foreground">
                LinkedIn Jobs requires{" "}
                <code className="font-mono">ENABLE_LINKEDIN_SCRAPER=true</code> in{" "}
                <code className="font-mono">.env</code>. See README for ToS
                implications before enabling.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="directHire"
              checked={prefs.directHireOnly}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, directHireOnly: e.target.checked }))
              }
              className="rounded"
            />
            <label htmlFor="directHire" className="text-sm">
              Direct hire only (exclude contracts)
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={runScan}
            disabled={scanning || prefs.boards.length === 0}
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {scanning ? "Scanning..." : "Scan Jobs"}
          </button>
        </CardContent>
      </Card>

      {hasScanned && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Results
            </h2>
            <span className="text-xs text-muted-foreground">
              {jobs.length} match{jobs.length !== 1 ? "es" : ""}
            </span>
          </div>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  No matches found. Try broadening your preferences.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Score</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Board</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <ScoreBadge score={job.matchScore} />
                      </TableCell>
                      <TableCell>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          {job.title}
                        </a>
                        {job.fitReason && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {job.fitReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{job.company}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.location}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {BOARD_LABELS[job.board]}
                        </Badge>
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
