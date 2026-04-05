"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SearchX, ExternalLink, FileText, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, XCircle, HelpCircle, BookOpen, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import type { JobMatch, JobBoard, ScanPreferences } from "../../domain/entities/JobMatch";
import type { ResponseType } from "../api/response/route";

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

interface JDAnalysis {
  overallFit: "strong" | "moderate" | "poor";
  fitScore: number;
  roleVerdict?: string;
  summary: string;
  matches: Array<{ label: string; detail: string }>;
  concerns: Array<{ label: string; detail: string }>;
  redFlags: Array<{ label: string; detail: string }>;
  isContract: boolean;
  isStaffingAgency: boolean;
  hasGovernmentWork?: boolean;
  locationMatch: boolean;
  recommendation: "apply" | "inquire" | "decline";
  recommendationReason?: string;
  missingFromProfile?: string[];
  suggestedQuestions?: string[];
}

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

const RESPONSE_CONFIG: Record<ResponseType, { label: string; icon: React.ReactNode; btn: string; msgBg: string; msgBorder: string; msgText: string }> = {
  accept: {
    label: "Accept / Express Interest",
    icon: <CheckCircle2 size={14} />,
    btn: "bg-green-600 hover:bg-green-700 text-white",
    msgBg: "bg-green-500/5",
    msgBorder: "border-green-500/30",
    msgText: "text-green-100",
  },
  inquire: {
    label: "Inquire for More Info",
    icon: <HelpCircle size={14} />,
    btn: "bg-[oklch(0.6_0.2_280)] hover:bg-[oklch(0.55_0.2_280)] text-white",
    msgBg: "bg-[oklch(0.6_0.2_280/5%)]",
    msgBorder: "border-[oklch(0.6_0.2_280/30%)]",
    msgText: "text-foreground",
  },
  decline: {
    label: "Decline",
    icon: <XCircle size={14} />,
    btn: "bg-destructive hover:bg-destructive/90 text-white",
    msgBg: "bg-destructive/5",
    msgBorder: "border-destructive/30",
    msgText: "text-foreground",
  },
};

function ResponseGenerator({ jobTitle, company, jdSummary }: { jobTitle: string; company: string; jdSummary?: string }) {
  const [activeType, setActiveType] = useState<ResponseType | null>(null);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState("");

  const generate = async (type: ResponseType, revisionText?: string) => {
    setActiveType(type);
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          jobTitle,
          company,
          jdSummary,
          feedback: revisionText,
          previousMessage: revisionText ? message : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(data.message);
      setRevision("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const cfg = activeType ? RESPONSE_CONFIG[activeType] : null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Draft a response to this recruiter:</p>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(RESPONSE_CONFIG) as [ResponseType, typeof RESPONSE_CONFIG[ResponseType]][]).map(([type, c]) => (
          <button
            key={type}
            onClick={() => generate(type)}
            disabled={generating}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${c.btn}`}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {(generating || message) && cfg && (
        <div className={`rounded-lg border p-4 space-y-3 ${cfg.msgBg} ${cfg.msgBorder}`}>
          {generating ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              Drafting {activeType} response...
            </div>
          ) : (
            <>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${cfg.msgText}`}>{message}</p>

              <div className="pt-2 border-t border-border/30 space-y-2">
                <p className="text-xs text-muted-foreground">Tell the AI how to revise it:</p>
                <textarea
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder='e.g. "make it shorter", "ask about remote policy", "sound less formal", "decline more firmly"'
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-none transition-shadow"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => generate(activeType!, revision)}
                    disabled={!revision.trim() || generating}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-3 py-1.5 text-xs font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={11} /> Revise
                  </button>
                  <button
                    onClick={() => generate(activeType!)}
                    disabled={generating}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw size={11} /> Regenerate from scratch
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PrepButton({ jobTitle, company, jdSummary }: { jobTitle: string; company: string; jdSummary?: string }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, company, jdSummary }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push(`/prep/${data.guide.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate guide");
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={generate}
        disabled={generating}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.6_0.2_280/40%)] text-[oklch(0.7_0.15_280)] px-3 py-1.5 text-xs font-medium hover:bg-[oklch(0.6_0.2_280/8%)] disabled:opacity-50 transition-colors"
      >
        {generating ? <><Loader2 size={12} className="animate-spin" />Generating guide...</> : <><BookOpen size={12} />Prep for Interview</>}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function JDAnalyzer({ prefs }: { prefs: ScanPreferences }) {
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const [jd, setJd] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragging, setPdfDragging] = useState(false);
  const [goals, setGoals] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  const analyze = async () => {
    setError(null);
    setAnalysis(null);
    setShowResponse(false);
    setAnalyzing(true);
    try {
      if (inputMode === "pdf") {
        if (!pdfFile) throw new Error("Please upload a JD PDF.");
        const form = new FormData();
        form.append("file", pdfFile);
        const res = await fetch("/api/jd-pdf", { method: "POST", body: form });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAnalysis(data.analysis);
      } else {
        const res = await fetch("/api/jd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jd, preferences: prefs, goals }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAnalysis(data.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const fitColor = analysis?.overallFit === "strong"
    ? "text-green-500 bg-green-500/10 border-green-500/30"
    : analysis?.overallFit === "moderate"
    ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/30"
    : "text-destructive bg-destructive/10 border-destructive/30";

  return (
    <Card className="border-border/60 bg-card/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-muted-foreground" />
          <CardTitle className="text-base">JD Analyzer</CardTitle>
          <CardDescription className="text-sm hidden sm:block">Compare a job description against your preferences</CardDescription>
        </div>
        {open ? <ChevronUp size={14} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <CardContent className="pt-0 space-y-4">
          <Separator className="opacity-50" />

          {/* Input mode toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/40 w-fit">
            {(["text", "pdf"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setInputMode(mode); setAnalysis(null); setError(null); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  inputMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "text" ? <FileText size={12} /> : <Upload size={12} />}
                {mode === "text" ? "Paste Text" : "Upload PDF"}
              </button>
            ))}
          </div>

          {inputMode === "text" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Job title <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Solutions Architect"
                    className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., Amazon"
                    className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Paste the job description</label>
                <textarea value={jd} onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the full job description here..." rows={8}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Additional goals <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input type="text" value={goals} onChange={(e) => setGoals(e.target.value)}
                  placeholder="e.g., fully remote, equity-heavy, Series B or later"
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow" />
              </div>
            </>
          ) : (
            <div
              onDrop={(e) => { e.preventDefault(); setPdfDragging(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".pdf")) setPdfFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setPdfDragging(true); }}
              onDragLeave={() => setPdfDragging(false)}
              onClick={() => document.getElementById("jd-pdf-input")?.click()}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                pdfDragging ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
                : pdfFile ? "border-green-500/40 bg-green-500/5"
                : "border-border/60 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
              }`}
            >
              <input id="jd-pdf-input" type="file" accept=".pdf" className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
              {pdfFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 size={24} className="text-green-500" />
                  <p className="text-sm font-medium">{pdfFile.name}</p>
                  <p className="text-xs text-muted-foreground">Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-muted-foreground" />
                  <p className="text-sm font-medium">Drop the JD PDF here</p>
                  <p className="text-xs text-muted-foreground">Compared against your goals, resume, and hard preferences</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={analyzing || (inputMode === "text" ? jd.trim().length < 20 : !pdfFile)}
            className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-5 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
          >
            {analyzing ? <><Loader2 size={14} className="animate-spin" />Analyzing...</> : "Analyze JD"}
          </button>

          {analysis && (
            <div className="space-y-4 pt-2">
              <Separator className="opacity-50" />

              {/* Fit score header */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${fitColor}`}>
                  {analysis.fitScore}/100 - {analysis.overallFit.charAt(0).toUpperCase() + analysis.overallFit.slice(1)} Fit
                </span>
                {analysis.isContract && <Badge variant="destructive" className="text-xs">Contract</Badge>}
                {analysis.isStaffingAgency && <Badge variant="destructive" className="text-xs">Staffing agency</Badge>}
                {analysis.hasGovernmentWork && <Badge variant="destructive" className="text-xs">Government work</Badge>}
                {!analysis.locationMatch && <Badge variant="secondary" className="text-xs">Location mismatch</Badge>}
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  analysis.recommendation === "apply" ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                  : analysis.recommendation === "inquire" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}>
                  {analysis.recommendation === "apply" ? "Apply" : analysis.recommendation === "inquire" ? "Inquire first" : "Pass"}
                </span>
              </div>

              {analysis.roleVerdict && (
                <p className="text-xs font-medium text-muted-foreground italic">{analysis.roleVerdict}</p>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
              {analysis.recommendationReason && (
                <p className="text-sm leading-relaxed">{analysis.recommendationReason}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.matches.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-green-500">Matches</p>
                    <ul className="space-y-1.5">
                      {analysis.matches.map((m, i) => (
                        <li key={i} className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                          <p className="text-xs font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.concerns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-yellow-500">Concerns</p>
                    <ul className="space-y-1.5">
                      {analysis.concerns.map((c, i) => (
                        <li key={i} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                          <p className="text-xs font-medium">{c.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.redFlags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Red Flags</p>
                    <ul className="space-y-1.5">
                      {analysis.redFlags.map((r, i) => (
                        <li key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                          <p className="text-xs font-medium">{r.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {analysis.missingFromProfile && analysis.missingFromProfile.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gaps to Address</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missingFromProfile.map((item, i) => (
                      <span key={i} className="rounded-full border border-yellow-500/30 bg-yellow-500/5 px-2.5 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.suggestedQuestions && analysis.suggestedQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questions to Ask</p>
                  <ul className="space-y-1">
                    {analysis.suggestedQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-4 pt-1 flex-wrap">
                <button
                  onClick={() => setShowResponse((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showResponse ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showResponse ? "Hide response" : "Draft a response"}
                </button>
                <PrepButton jobTitle={jobTitle || "this role"} company={company || "this company"} jdSummary={analysis.summary} />
              </div>

              {showResponse && (
                <ResponseGenerator
                  jobTitle="this role"
                  company="this company"
                  jdSummary={analysis.summary}
                />
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function JobsPage() {
  const [prefs, setPrefs] = useState<ScanPreferences>(DEFAULT_PREFS);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

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
        <p className="mt-1.5 text-sm text-muted-foreground">
          Scan job boards for direct-hire roles at well-established companies.
        </p>
      </div>

      {/* JD Analyzer */}
      <JDAnalyzer prefs={prefs} />

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
                LinkedIn Jobs requires <code className="font-mono">ENABLE_LINKEDIN_SCRAPER=true</code>. See README.
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
            <div className="space-y-2">
              {jobs.map((job) => {
                const isExpanded = expandedJob === job.id;
                return (
                  <Card key={job.id} className="border-border/60 bg-card/60 overflow-hidden">
                    <button
                      onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                      className="w-full text-left"
                    >
                      <Table>
                        <TableBody>
                          <TableRow className="border-0 hover:bg-muted/30 transition-colors group">
                            <TableCell className="w-16"><ScorePill score={job.matchScore} /></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <a href={job.url} target="_blank" rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm font-medium hover:text-[oklch(0.7_0.15_280)] transition-colors inline-flex items-center gap-1.5 group-hover:underline underline-offset-2">
                                  {job.title}
                                  <ExternalLink size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                                </a>
                              </div>
                              {job.fitReason && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{job.fitReason}</p>
                              )}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{job.company}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{job.location}</TableCell>
                            <TableCell className="w-24">
                              <span className="text-xs px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                                {BOARD_LABELS[job.board]}
                              </span>
                            </TableCell>
                            <TableCell className="w-8 text-muted-foreground">
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-border/40 space-y-4">
                        <PrepButton jobTitle={job.title} company={job.company} jdSummary={job.fitReason} />
                        <Separator className="opacity-40" />
                        <ResponseGenerator
                          jobTitle={job.title}
                          company={job.company}
                          jdSummary={job.fitReason}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
