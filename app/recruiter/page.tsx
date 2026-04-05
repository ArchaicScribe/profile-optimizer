"use client";

import { useCallback, useState } from "react";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, FileText,
  ChevronDown, ChevronUp, RefreshCw, CheckCircle, XCircle, HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ---- Types ----------------------------------------------------------------

type ResponseType = "accept" | "decline" | "inquire";

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
  id, accept, file, onFile, label, hint,
}: {
  id: string;
  accept: string;
  file: File | null;
  onFile: (f: File) => void;
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
          <p className="text-xs text-muted-foreground">Click to replace</p>
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

function ResponseGenerator({ context }: { context: string }) {
  const [activeType, setActiveType] = useState<ResponseType | null>(null);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [revision, setRevision] = useState("");
  const [error, setError] = useState<string | null>(null);

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
          jobTitle: "this role",
          company: "this company",
          jdSummary: context,
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
    <div className="space-y-4">
      <p className="text-sm font-medium">Draft a response:</p>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(RESPONSE_CONFIG) as [ResponseType, typeof RESPONSE_CONFIG[ResponseType]][]).map(([type, c]) => (
          <button key={type} onClick={() => generate(type)} disabled={generating}
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
              <div className="pt-2 border-t border-border/30 space-y-2">
                <p className="text-sm text-muted-foreground">Tell the AI how to revise it:</p>
                <textarea
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder='e.g. "make it shorter", "ask about remote policy", "decline more firmly", "ask about comp range"'
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-none transition-shadow"
                />
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => generate(activeType!, revision)} disabled={!revision.trim() || generating}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-3 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors">
                    <RefreshCw size={13} /> Revise
                  </button>
                  <button onClick={() => generate(activeType!)} disabled={generating}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw size={13} /> Regenerate from scratch
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

// ---- Main page ------------------------------------------------------------

export default function RecruiterPage() {
  const [message, setMessage] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [jdMode, setJdMode] = useState<"text" | "pdf">("pdf");
  const [analyzing, setAnalyzing] = useState(false);
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [responseContext, setResponseContext] = useState<string>("");
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
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-muted-foreground" />
                <CardTitle className="text-base">Recruiter Message</CardTitle>
              </div>
              <CardDescription>Paste the email, LinkedIn message, or InMail in full.</CardDescription>
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
                {([["pdf", "Upload PDF"], ["text", "Paste Text"]] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => setJdMode(mode)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      jdMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {jdMode === "pdf" && (
                <DropZone id="jd-pdf" accept=".pdf" file={jdFile} onFile={setJdFile}
                  label="Drop JD PDF here or click to browse"
                  hint="Compared against your goals, target roles, and hard preferences" />
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
              <DropZone id="resume-pdf" accept=".pdf,.docx" file={resumeFile} onFile={setResumeFile}
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
                    <ResponseGenerator context={responseContext} />
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
