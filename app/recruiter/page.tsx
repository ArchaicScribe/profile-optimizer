"use client";

import { useCallback, useState } from "react";
import type { JDAnalysis } from "../../lib/types";
import { consumeSSE } from "../../lib/consumeSSE";
import type { ResponseType, SourceType } from "../api/response/route";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, FileText, X,
  ChevronDown, ChevronUp, RefreshCw, CheckCircle, XCircle, HelpCircle, Send, Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ---- Response config ------------------------------------------------------

const RESPONSE_CONFIG: Record<ResponseType, { label: string; icon: React.ReactNode; btn: string; bg: string; border: string }> = {
  accept: {
    label: "Accept / Express Interest",
    icon: <CheckCircle size={14} />,
    btn: "bg-green-600 hover:bg-green-700 text-white",
    bg: "bg-green-500/5",
    border: "border-green-500/30",
  },
  inquire: {
    label: "Inquire for More Info",
    icon: <HelpCircle size={14} />,
    btn: "bg-[oklch(0.6_0.2_280)] hover:bg-[oklch(0.55_0.2_280)] text-white",
    bg: "bg-[oklch(0.6_0.2_280/5%)]",
    border: "border-[oklch(0.6_0.2_280/30%)]",
  },
  decline: {
    label: "Decline",
    icon: <XCircle size={14} />,
    btn: "bg-destructive hover:bg-destructive/90 text-white",
    bg: "bg-destructive/5",
    border: "border-destructive/30",
  },
};

// ---- File drop zone -------------------------------------------------------

function DropZone({
  id, accept, file, onFile, onClear, label, hint,
}: {
  id: string;
  accept: string;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  label: string;
  hint: string;
}) {
  const [dragging, setDragging] = useState(false);
  const check = (f: File) => accept.split(",").some((ext) => f.name.endsWith(ext.trim()));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && check(f)) onFile(f);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => document.getElementById(id)?.click()}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
        dragging ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
        : file ? "border-green-500/40 bg-green-500/5"
        : "border-border/60 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
      }`}
    >
      <input id={id} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f && check(f)) onFile(f); }} />
      {file ? (
        <div className="flex flex-col items-center gap-1.5">
          <CheckCircle2 size={20} className="text-green-500" />
          <p className="text-sm font-medium">{file.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">Click to replace</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={11} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <Upload size={20} className="text-muted-foreground" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      )}
    </div>
  );
}

// ---- JD Analysis results --------------------------------------------------

function JDResults({ analysis }: { analysis: JDAnalysis }) {
  const fitColor = analysis.overallFit === "strong"
    ? "text-green-500 bg-green-500/10 border-green-500/30"
    : analysis.overallFit === "moderate"
    ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/30"
    : "text-destructive bg-destructive/10 border-destructive/30";

  const recColor = analysis.recommendation === "apply"
    ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
    : analysis.recommendation === "inquire"
    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
    : "border-destructive/30 bg-destructive/10 text-destructive";

  const recLabel = analysis.recommendation === "apply" ? "Apply" : analysis.recommendation === "inquire" ? "Inquire first" : "Pass";

  return (
    <div className="space-y-5">
      {/* Score + badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${fitColor}`}>
          {analysis.fitScore}/100 - {analysis.overallFit.charAt(0).toUpperCase() + analysis.overallFit.slice(1)} Fit
        </span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${recColor}`}>
          {recLabel}
        </span>
        {analysis.isContract && <Badge variant="destructive" className="text-xs">Contract</Badge>}
        {analysis.isStaffingAgency && <Badge variant="destructive" className="text-xs">Staffing agency</Badge>}
        {analysis.hasGovernmentWork && <Badge variant="destructive" className="text-xs">Government work</Badge>}
        {!analysis.locationMatch && <Badge variant="secondary" className="text-xs">Location mismatch</Badge>}
      </div>

      {analysis.roleVerdict && (
        <p className="text-sm italic text-muted-foreground">{analysis.roleVerdict}</p>
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
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.detail}</p>
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
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{c.detail}</p>
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
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.detail}</p>
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
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Response generator ---------------------------------------------------

function ResponseGenerator({ context, sourceType }: { context: string; sourceType: SourceType }) {
  const [activeType, setActiveType] = useState<ResponseType | null>(null);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [liked, setLiked] = useState("");
  const [disliked, setDisliked] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRevision, setShowRevision] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasRevisionInput = liked.trim() || disliked.trim() || notes.trim();

  const generate = async (type: ResponseType, isRevision = false) => {
    setActiveType(type);
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          sourceType,
          jobTitle: "this role",
          company: "this company",
          jdSummary: context,
          liked: isRevision ? liked : undefined,
          disliked: isRevision ? disliked : undefined,
          notes: isRevision ? notes : undefined,
          previousMessage: isRevision ? message : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(data.message);
      setCopied(false);
      if (isRevision) {
        setLiked("");
        setDisliked("");
        setNotes("");
        setShowRevision(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const cfg = activeType ? RESPONSE_CONFIG[activeType] : null;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Draft a response:</p>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(RESPONSE_CONFIG) as [ResponseType, typeof RESPONSE_CONFIG[ResponseType]][]).map(([type, c]) => (
          <button key={type} onClick={() => { setShowRevision(false); generate(type); }} disabled={generating}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${c.btn}`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {(generating || message) && cfg && (
        <div className={`rounded-lg border p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
          {generating ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Drafting {activeType} response...
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">{message}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-all ${
                    copied
                      ? "border-green-500/40 bg-green-500/10 text-green-500"
                      : "border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="pt-2 border-t border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revise this draft</p>
                  <button onClick={() => setShowRevision((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {showRevision ? "Hide" : "Give feedback"}
                  </button>
                </div>

                {showRevision && (
                  <div className="space-y-3">
                    {/* What works */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-green-500">What works — keep this</label>
                      <textarea
                        value={liked}
                        onChange={(e) => setLiked(e.target.value)}
                        placeholder='e.g. "I like the opening line" or "keep it asking about a call"'
                        rows={2}
                        className="w-full rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/30 resize-none transition-shadow placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* What to change */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-yellow-500">What to change</label>
                      <textarea
                        value={disliked}
                        onChange={(e) => setDisliked(e.target.value)}
                        placeholder='e.g. "too formal", "remove the salary mention", "make it shorter", "ask about remote policy instead"'
                        rows={2}
                        className="w-full rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30 resize-none transition-shadow placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* Editorial notes */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Style / editorial notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder='e.g. "I never start messages with Hi", "I prefer first names only", "I want to sound more senior and less eager"'
                        rows={2}
                        className="w-full rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-none transition-shadow placeholder:text-muted-foreground/50"
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                      <button
                        onClick={() => generate(activeType!, true)}
                        disabled={!hasRevisionInput || generating}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-3 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw size={13} /> Revise
                      </button>
                      <button
                        onClick={() => generate(activeType!)}
                        disabled={generating}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw size={13} /> Regenerate from scratch
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main page ------------------------------------------------------------

const SOURCE_TYPES: { value: SourceType; label: string; hint: string }[] = [
  { value: "email",    label: "Email",             hint: "Formal email reply, up to 180 words" },
  { value: "linkedin", label: "LinkedIn Message",  hint: "Short, conversational, under 100 words" },
  { value: "inmail",   label: "LinkedIn InMail",   hint: "Polished cold outreach reply, under 150 words" },
];

export default function RecruiterPage() {
  const [message, setMessage] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("linkedin");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [jdMode, setJdMode] = useState<"text" | "pdf">("pdf");
  const [analyzing, setAnalyzing] = useState(false);
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [responseContext, setResponseContext] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  const analyze = async () => {
    if (!message.trim()) return;
    setAnalyzing(true);
    setError(null);
    setJdAnalysis(null);
    setAnalyzed(false);
    setShowResponse(false);
    setChatHistory([]);
    setChatInput("");

    try {
      // If JD provided, analyze it
      if (jdMode === "pdf" && jdFile) {
        const form = new FormData();
        form.append("file", jdFile);
        const res = await fetch("/api/jd-pdf", { method: "POST", body: form });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setJdAnalysis(data.analysis);
        setResponseContext(data.analysis.summary ?? message);
      } else if (jdMode === "text" && jdText.trim()) {
        const res = await fetch("/api/jd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jd: jdText, preferences: {}, goals: "" }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setJdAnalysis(data.analysis);
        setResponseContext(data.analysis.summary ?? message);
      } else {
        setResponseContext(message);
      }

      setAnalyzed(true);
      setShowResponse(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Recruiter Analyzer</h1>
        <p className="mt-1.5 text-muted-foreground">
          Paste a recruiter message, optionally attach the JD and your resume, and get a fit assessment plus ready-to-send responses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-5">
          {/* Recruiter message */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-muted-foreground" />
                  <CardTitle className="text-base">Recruiter Message</CardTitle>
                </div>
                {/* Source type toggle */}
                <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted/40 shrink-0">
                  {SOURCE_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSourceType(value)}
                      title={SOURCE_TYPES.find(s => s.value === value)?.hint}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        sourceType === value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <CardDescription>
                Paste the full message below.{" "}
                <span className="text-muted-foreground/70">
                  {SOURCE_TYPES.find(s => s.value === sourceType)?.hint}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={"Hi Alex, I came across your profile and wanted to reach out about a\nSolutions Architect role at [Company]...\n\nPaste the full message here."}
                rows={8}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow"
              />
            </CardContent>
          </Card>

          {/* JD upload */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-muted-foreground" />
                <CardTitle className="text-base">Job Description</CardTitle>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <CardDescription>Attach or paste the JD to get a full fit assessment against your goals and profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-lg bg-muted/40 w-fit">
                {([["pdf", "Upload File"], ["text", "Paste Text"]] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => setJdMode(mode)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      jdMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {jdMode === "pdf" && (
                <DropZone id="jd-pdf" accept=".pdf,.docx,.doc,.txt" file={jdFile} onFile={setJdFile} onClear={() => setJdFile(null)}
                  label="Drop JD here or click to browse"
                  hint="PDF, DOCX, DOC, or TXT — compared against your goals and hard preferences" />
              )}

              {jdMode === "text" && (
                <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={6}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow" />
              )}
            </CardContent>
          </Card>

          {/* Resume upload */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Upload size={15} className="text-muted-foreground" />
                <CardTitle className="text-base">Resume</CardTitle>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <CardDescription>Attach your resume for a personalized fit assessment and tailored response drafts.</CardDescription>
            </CardHeader>
            <CardContent>
              <DropZone id="resume-pdf" accept=".pdf,.docx" file={resumeFile} onFile={setResumeFile} onClear={() => setResumeFile(null)}
                label="Drop PDF or DOCX here, or click to browse"
                hint="Used to personalize the fit assessment and response tone" />
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <button onClick={analyze} disabled={analyzing || !message.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-6 py-2.5 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors">
            {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : "Analyze Message"}
          </button>
        </div>

        {/* Right: Results */}
        <div className="space-y-5">
          {!analyzed && !analyzing && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border/50 text-center gap-3">
              <FileText size={32} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Paste a recruiter message and hit Analyze to get started</p>
            </div>
          )}

          {analyzing && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 size={24} className="animate-spin text-[oklch(0.6_0.2_280)]" />
              <p className="text-sm text-muted-foreground">Analyzing...</p>
            </div>
          )}

          {analyzed && !analyzing && (
            <>
              {/* JD analysis */}
              {jdAnalysis ? (
                <Card className="border-border/60 bg-card/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">JD Fit Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JDResults analysis={jdAnalysis} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/60 bg-card/60">
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm text-muted-foreground">
                      No JD provided. Add a job description to get a full fit assessment against your goals and preferences.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* JD follow-up chat */}
              {jdAnalysis && (
                <Card className="border-border/60 bg-card/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ask About This Analysis</CardTitle>
                    <CardDescription>
                      Ask why something was flagged, what signals triggered a red flag, or anything else about this result.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Suggested questions */}
                    {chatHistory.length === 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "How did you know this was a staffing agency?",
                          "Why did you flag this as a contract role?",
                          "What specific language triggered the government work flag?",
                          "What's missing from my profile for this role?",
                          "Why did you score this below 70?",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => setChatInput(q)}
                            className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-[oklch(0.6_0.2_280/40%)] transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Chat history */}
                    {chatHistory.length > 0 && (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                              <div className="w-5 h-5 rounded-full bg-[oklch(0.6_0.2_280/20%)] border border-[oklch(0.6_0.2_280/30%)] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[9px] font-bold text-[oklch(0.6_0.2_280)]">AI</span>
                              </div>
                            )}
                            <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] leading-relaxed ${
                              msg.role === "user"
                                ? "bg-[oklch(0.6_0.2_280/15%)] border border-[oklch(0.6_0.2_280/25%)] text-foreground"
                                : "bg-muted/40 border border-border/40 text-foreground"
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex gap-2.5 justify-start">
                            <div className="w-5 h-5 rounded-full bg-[oklch(0.6_0.2_280/20%)] border border-[oklch(0.6_0.2_280/30%)] flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[9px] font-bold text-[oklch(0.6_0.2_280)]">AI</span>
                            </div>
                            <div className="rounded-xl px-3 py-2 bg-muted/40 border border-border/40">
                              <Loader2 size={13} className="animate-spin text-muted-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Input */}
                    {(() => {
                      const sendChat = async () => {
                        const q = chatInput.trim();
                        if (!q || chatLoading || !jdAnalysis) return;
                        const newHistory = [...chatHistory, { role: "user" as const, content: q }];
                        setChatHistory(newHistory);
                        setChatInput("");
                        setChatLoading(true);
                        try {
                          const res = await fetch("/api/jd-chat", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ question: q, analysis: jdAnalysis, jdText, history: chatHistory }),
                          });
                          const answer = await consumeSSE(res, (_, acc) => {
                            setChatHistory([...newHistory, { role: "assistant", content: acc }]);
                          });
                          setChatHistory([...newHistory, { role: "assistant", content: answer }]);
                        } catch {
                          setChatHistory([...newHistory, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
                        } finally {
                          setChatLoading(false);
                        }
                      };
                      return (
                        <div className="flex gap-2">
                          <input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                            placeholder="How did you know this was a contract role?"
                            disabled={chatLoading}
                            className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow disabled:opacity-50"
                          />
                          <button
                            disabled={!chatInput.trim() || chatLoading}
                            onClick={sendChat}
                            className="rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-3 py-2 hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      );
                    })()}

                    {chatHistory.length > 0 && (
                      <button onClick={() => setChatHistory([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Clear conversation
                      </button>
                    )}
                  </CardContent>
                </Card>
              )}

              <Separator className="opacity-50" />

              {/* Response generator */}
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Response Drafts</CardTitle>
                    <button onClick={() => setShowResponse((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      {showResponse ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  <CardDescription>Generate a response to this recruiter. Revise until it sounds like you.</CardDescription>
                </CardHeader>
                {showResponse && (
                  <CardContent>
                    <ResponseGenerator context={responseContext} sourceType={sourceType} />
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
