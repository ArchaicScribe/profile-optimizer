"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { consumeSSE } from "../../lib/consumeSSE";
import { extractJson } from "../../lib/extractJson";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Copy, CheckCheck, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface JDComparison {
  fitScore: number;
  verdict: string;
  matched: string[];
  gaps: string[];
  tailoringTips: string[];
}

interface ResumeResult {
  score: number;
  headline: string;
  strengths: Array<{ point: string; detail: string }>;
  weaknesses: Array<{ point: string; detail: string; severity: "high" | "medium" | "low" }>;
  rewrites: Array<{ original: string; rewritten: string; reason: string }>;
  missing: Array<{ item: string; detail: string }>;
  redFlags: Array<{ flag: string; detail: string }>;
  nextSteps: string[];
  jdComparison?: JDComparison;
}

const PRIORITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

function RewriteCard({ r }: { r: ResumeResult["rewrites"][0] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-border/60 bg-card/60">
      <button onClick={() => setOpen(v => !v)} className="w-full text-left px-4 py-3 flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-2">{r.original}</p>
        {open ? <ChevronUp size={14} className="shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 mt-0.5 text-muted-foreground" />}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 space-y-3">
          <Separator className="opacity-40" />
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Before</p>
            <p className="text-sm text-muted-foreground italic leading-relaxed">{r.original}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-500">After</p>
              <CopyButton text={r.rewritten} />
            </div>
            <p className="text-sm leading-relaxed">{r.rewritten}</p>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">{r.reason}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ResumePage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeDragging, setResumeDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jdText, setJdText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamChunks, setStreamChunks] = useState<string[]>([]);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resumeFile) {
      const url = URL.createObjectURL(resumeFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [resumeFile]);

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setResumeDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".pdf")) setResumeFile(dropped);
  }, []);

  const analyze = async () => {
    if (!resumeFile) { setError("Please upload a PDF resume."); return; }
    setError(null);
    setStreamChunks([]);
    setResult(null);
    setStreaming(true);

    const form = new FormData();
    form.append("file", resumeFile);
    if (jdText.trim()) form.append("jdText", jdText.trim());

    try {
      const res = await fetch("/api/resume", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const accumulated = await consumeSSE(res, (chunk) => {
        setStreamChunks(prev => [...prev, chunk]);
        setTimeout(() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" }), 10);
      });
      try { setResult(extractJson(accumulated)); } catch { /* show raw */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume analysis failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Resume Matcher</h1>
        <p className="mt-1.5 text-muted-foreground">
          Upload your resume and paste a job description — get a fit score, gap analysis, and ready-to-paste rewrites.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-4">
          {/* Resume upload */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resume</CardTitle>
              <p className="text-sm text-muted-foreground">PDF — preview renders on the right.</p>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleResumeDrop}
                onDragOver={(e) => { e.preventDefault(); setResumeDragging(true); }}
                onDragLeave={() => setResumeDragging(false)}
                onClick={() => document.getElementById("resume-pdf-input")?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  resumeDragging
                    ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
                    : resumeFile
                    ? "border-green-500/40 bg-green-500/5"
                    : "border-border/60 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
                }`}
              >
                <input
                  id="resume-pdf-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
                {resumeFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 size={24} className="text-green-500" />
                    <p className="text-sm font-medium">{resumeFile.name}</p>
                    <p className="text-xs text-muted-foreground">Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={24} className="text-muted-foreground" />
                    <p className="text-sm font-medium">Drop your resume PDF here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* JD paste */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Job Description</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Paste the full JD — the more detail, the better the analysis.</p>
                </div>
                {jdText && (
                  <button onClick={() => setJdText("")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste job description here..."
                rows={10}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow resize-y leading-relaxed"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Optional — enables JD fit score and gap analysis.
              </p>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={streaming || !resumeFile}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
          >
            {streaming ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : "Analyze Resume"}
          </button>
        </div>

        {/* Right: Preview */}
        <Card className="border-border/60 bg-card/60 flex flex-col" style={{ minHeight: "600px" }}>
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={15} className="text-muted-foreground" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-3">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border border-border/40"
                style={{ minHeight: "540px" }}
                title="Resume preview"
              />
            ) : (
              <div className="w-full h-full rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center" style={{ minHeight: "540px" }}>
                <div className="text-center space-y-2">
                  <FileText size={32} className="text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">Upload a resume to preview</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Streaming display */}
      {(streaming || streamChunks.length > 0) && !result && (
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Analysis
              {streaming && <span className="inline-block h-2 w-2 rounded-full bg-[oklch(0.6_0.2_280)] animate-pulse" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={streamRef}
              className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg p-4 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap border border-border/40"
            >
              {streamChunks.join("")}
              {streaming && <span className="inline-block w-1.5 h-3.5 bg-[oklch(0.6_0.2_280)] ml-0.5 animate-pulse rounded-sm" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          {/* Score */}
          <Card className="border-border/60 bg-card/60">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <span className={`text-5xl font-bold tabular-nums ${
                    result.score >= 75 ? "text-green-500" : result.score >= 50 ? "text-yellow-500" : "text-destructive"
                  }`}>{result.score}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">SE/SA/CA Score</span>
                </div>
                <div className="flex-1 space-y-2">
                  <Progress value={result.score} className="h-2" />
                  <p className="text-sm font-medium">{result.headline}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JD Comparison */}
          {result.jdComparison && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">JD Fit Analysis</h2>
                <Card className="border-[oklch(0.6_0.2_280/30%)] bg-[oklch(0.6_0.2_280/5%)]">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-6 mb-4">
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <span className={`text-4xl font-bold tabular-nums ${
                          result.jdComparison.fitScore >= 75 ? "text-green-500" : result.jdComparison.fitScore >= 50 ? "text-yellow-500" : "text-destructive"
                        }`}>{result.jdComparison.fitScore}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">JD Fit</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Progress value={result.jdComparison.fitScore} className="h-2" />
                        <p className="text-sm italic text-muted-foreground">{result.jdComparison.verdict}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.jdComparison.matched.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-green-500">Matched ({result.jdComparison.matched.length})</p>
                          <ul className="space-y-1">
                            {result.jdComparison.matched.map((m, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                                {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.jdComparison.gaps.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Gaps ({result.jdComparison.gaps.length})</p>
                          <ul className="space-y-1">
                            {result.jdComparison.gaps.map((g, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-destructive mt-0.5 shrink-0">✗</span>
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {result.jdComparison.tailoringTips.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tailoring Tips</p>
                        <ul className="space-y-1.5">
                          {result.jdComparison.tailoringTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-[oklch(0.6_0.2_280)] mt-0.5 shrink-0">→</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <Separator className="opacity-50" />

          {/* Strengths + Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.strengths.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Strengths ({result.strengths.length})
                </h2>
                <div className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <div key={i} className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">{s.point}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.weaknesses.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Weaknesses ({result.weaknesses.length})
                </h2>
                <div className="space-y-2">
                  {result.weaknesses.map((w, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${
                      w.severity === "high" ? "border-destructive/30 bg-destructive/5" :
                      w.severity === "medium" ? "border-yellow-500/30 bg-yellow-500/5" :
                      "border-border/60 bg-card/40"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Badge variant={PRIORITY_VARIANT[w.severity] ?? "outline"} className="text-xs shrink-0">{w.severity}</Badge>
                        <p className="text-sm font-medium">{w.point}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{w.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rewrites */}
          {result.rewrites.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bullet Rewrites ({result.rewrites.length})
                </h2>
                <div className="space-y-2">
                  {result.rewrites.map((r, i) => <RewriteCard key={i} r={r} />)}
                </div>
              </div>
            </>
          )}

          {/* Missing + Red Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.missing.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Missing ({result.missing.length})
                </h2>
                <div className="space-y-2">
                  {result.missing.map((m, i) => (
                    <div key={i} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{m.item}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{m.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.redFlags.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Red Flags ({result.redFlags.length})
                </h2>
                <div className="space-y-2">
                  {result.redFlags.map((f, i) => (
                    <div key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-sm font-medium text-destructive">{f.flag}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Next Steps */}
          {result.nextSteps.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Steps</h2>
                <ol className="space-y-2">
                  {result.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[oklch(0.6_0.2_280/15%)] text-[10px] font-bold text-[oklch(0.6_0.2_280)] mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
