"use client";

import { useCallback, useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Loader2, Upload, FileText, RefreshCw, Mail,
  ChevronDown, ChevronUp, MessageSquare, Building2, UserRound,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type EmailType = "cold_outreach" | "application" | "follow_up" | "networking";

const EMAIL_TYPES: { value: EmailType; label: string }[] = [
  { value: "cold_outreach",  label: "Cold Outreach" },
  { value: "application",    label: "Application"   },
  { value: "follow_up",      label: "Follow-Up"     },
  { value: "networking",     label: "Networking"    },
];

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({
  id, accept, file, onFile, label,
}: {
  id: string;
  accept: string;
  file: File | null;
  onFile: (f: File) => void;
  label: string;
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
    <label
      htmlFor={id}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
          : file
          ? "border-[oklch(0.6_0.2_280/40%)] bg-[oklch(0.6_0.2_280/5%)]"
          : "border-border/50 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
      }`}
    >
      <input id={id} type="file" accept={accept} className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f && check(f)) onFile(f);
      }} />
      {file ? (
        <FileText size={16} className="shrink-0 text-[oklch(0.7_0.18_280)]" />
      ) : (
        <Upload size={16} className="shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{file ? file.name : label}</p>
        {file && <p className="text-xs text-muted-foreground">Click to replace</p>}
      </div>
    </label>
  );
}

// ─── Collapsible section ───────────────────────────────────────────────────────

function CollapsibleSection({
  title, badge, children, defaultOpen = false,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <span className="rounded-full bg-[oklch(0.6_0.2_280/12%)] text-[oklch(0.6_0.2_280)] text-[10px] font-semibold px-2 py-0.5">
              {badge}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-normal">optional</span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-muted-foreground" />
          : <ChevronDown size={14} className="text-muted-foreground" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────

function EmailResult({ email, onRevise }: { email: string; onRevise: (feedback: string) => void }) {
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState("");
  const lines = email.split("\n");
  const subject = lines[0]?.startsWith("Subject:") ? lines[0].replace("Subject:", "").trim() : null;
  const body = subject ? lines.slice(2).join("\n") : email;

  const handleRevise = () => {
    if (!feedback.trim()) return;
    onRevise(feedback.trim());
    setFeedback("");
    setRevising(false);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-[oklch(0.7_0.18_280)]" />
          <span className="text-sm font-semibold">Generated Email</span>
        </div>
        <CopyButton text={email} />
      </div>

      {/* Subject */}
      {subject && (
        <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Subject</p>
          <p className="text-sm font-medium">{subject}</p>
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{body.trim()}</p>
      </div>

      {/* Revise */}
      <div className="px-4 pb-4 pt-1">
        <Separator className="opacity-30 mb-3" />
        {revising ? (
          <div className="space-y-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What should change? e.g. 'make it shorter', 'more confident tone', 'mention AWS experience'"
              rows={3}
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleRevise}
                disabled={!feedback.trim()}
                className="px-4 py-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] hover:bg-[oklch(0.55_0.2_280)] text-white text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={() => { setRevising(false); setFeedback(""); }}
                className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRevising(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={12} />
            Request revision
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailPage() {
  const [recruiterMsg, setRecruiterMsg] = useState("");
  const [emailType, setEmailType]       = useState<EmailType | null>(null);
  const [company, setCompany]           = useState("");
  const [role, setRole]                 = useState("");
  const [jdMode, setJdMode]             = useState<"pdf" | "text">("text");
  const [jdFile, setJdFile]             = useState<File | null>(null);
  const [jdText, setJdText]             = useState("");
  const [resumeFile, setResumeFile]     = useState<File | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [email, setEmail]               = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const hasJD = (jdMode === "pdf" && jdFile) || (jdMode === "text" && jdText.trim());
  const canGenerate = recruiterMsg.trim() || company.trim() || role.trim() || hasJD;

  const generate = useCallback(async (feedback?: string) => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);
    try {
      const form = new FormData();
      if (recruiterMsg.trim()) form.append("recruiterMessage", recruiterMsg.trim());
      if (emailType)           form.append("type", emailType);
      if (company.trim())      form.append("company", company.trim());
      if (role.trim())         form.append("role", role.trim());
      if (jdMode === "pdf" && jdFile)         form.append("jdFile", jdFile);
      if (jdMode === "text" && jdText.trim()) form.append("jd", jdText.trim());
      if (resumeFile) form.append("resumeFile", resumeFile);
      if (feedback && email) {
        form.append("feedback", feedback);
        form.append("previous", email);
      }

      const res  = await fetch("/api/email", { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email generation failed");
    } finally {
      setGenerating(false);
    }
  }, [recruiterMsg, emailType, company, role, jdMode, jdFile, jdText, resumeFile, email, canGenerate]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Email Composer</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Generate polished outreach emails. Provide as much or as little context as you have.
        </p>
      </div>

      {/* ── Recruiter message ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-muted-foreground" />
          <label className="text-sm font-semibold">Recruiter's Message</label>
          <span className="text-xs text-muted-foreground">optional</span>
        </div>
        <textarea
          value={recruiterMsg}
          onChange={(e) => setRecruiterMsg(e.target.value)}
          placeholder="Paste the recruiter's message here. Claude will tailor the reply to match the tone and context of what they sent."
          rows={5}
          className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow placeholder:text-muted-foreground/60"
        />
      </div>

      {/* ── Email type pills ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Email Type</span>
          <span className="text-xs text-muted-foreground">optional — Claude will infer if left blank</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EMAIL_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setEmailType(emailType === value ? null : value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                emailType === value
                  ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/12%)] text-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Position details ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Position Details</span>
          <span className="text-xs text-muted-foreground">optional</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
          </div>
          <div className="relative">
            <UserRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role / title"
              className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
          </div>
        </div>
      </div>

      {/* ── JD (collapsible) ── */}
      <CollapsibleSection title="Job Description" badge={hasJD ? "attached" : undefined}>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/40 w-fit mb-1">
          {(["text", "pdf"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setJdMode(mode)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                jdMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "pdf" ? "Upload PDF" : "Paste Text"}
            </button>
          ))}
        </div>
        {jdMode === "text" ? (
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={6}
            className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow"
          />
        ) : (
          <DropZone id="jd-pdf" accept=".pdf" file={jdFile} onFile={setJdFile} label="Drop JD PDF or click to browse" />
        )}
      </CollapsibleSection>

      {/* ── Resume (collapsible) ── */}
      <CollapsibleSection title="Resume" badge={resumeFile ? "attached" : undefined}>
        <p className="text-xs text-muted-foreground">Attach your resume to personalize the email with your background.</p>
        <DropZone id="resume-pdf" accept=".pdf" file={resumeFile} onFile={setResumeFile} label="Drop Resume PDF or click to browse" />
      </CollapsibleSection>

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-2.5">{error}</p>
      )}

      {/* ── Generate button ── */}
      <button
        onClick={() => generate()}
        disabled={!canGenerate || generating}
        className="w-full rounded-xl bg-[oklch(0.45_0.14_145)] hover:bg-[oklch(0.40_0.14_145)] active:scale-[0.99] text-white font-semibold py-3 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
      >
        {generating ? (
          <><Loader2 size={16} className="animate-spin" />Generating...</>
        ) : (
          <><Mail size={16} />Generate Email</>
        )}
      </button>

      {/* ── Result ── */}
      {email && (
        <EmailResult email={email} onRevise={(feedback) => generate(feedback)} />
      )}
    </div>
  );
}
