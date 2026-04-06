"use client";

import { useCallback, useRef, useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Loader2, Upload, FileText, RefreshCw, Mail,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type EmailType = "cold_outreach" | "application" | "follow_up" | "networking";

const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  cold_outreach: "Cold Outreach",
  application: "Application",
  follow_up: "Follow-Up",
  networking: "Networking",
};

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
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
          : file
          ? "border-[oklch(0.6_0.2_280/40%)] bg-[oklch(0.6_0.2_280/4%)]"
          : "border-border/60 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
      }`}
    >
      <input id={id} type="file" accept={accept} className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f && check(f)) onFile(f);
      }} />
      {file ? (
        <>
          <FileText size={18} className="text-[oklch(0.7_0.18_280)]" />
          <p className="text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">Click to replace</p>
        </>
      ) : (
        <>
          <Upload size={18} className="text-muted-foreground" />
          <p className="text-sm font-medium">{label}</p>
        </>
      )}
    </label>
  );
}

function EmailResult({ email, onRevise }: { email: string; onRevise: (feedback: string) => void }) {
  const [open, setOpen] = useState(true);
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState("");
  const lines = email.split("\n");
  const subject = lines[0]?.startsWith("Subject:") ? lines[0] : null;
  const body = subject ? lines.slice(2).join("\n") : email;

  const handleRevise = () => {
    if (!feedback.trim()) return;
    onRevise(feedback.trim());
    setFeedback("");
    setRevising(false);
  };

  return (
    <Card className="border-border/60 bg-card/60">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-[oklch(0.7_0.18_280)]" />
          <span className="text-sm font-medium">Generated Email</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={email} />
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 space-y-4">
          <Separator className="opacity-40" />
          {subject && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
              <p className="text-sm font-medium">{subject.replace("Subject:", "").trim()}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Body</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{body.trim()}</p>
          </div>
          <Separator className="opacity-40" />
          {revising ? (
            <div className="space-y-2">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What would you like changed? (e.g. 'make it shorter', 'more confident tone', 'mention AWS experience')"
                rows={3}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRevise}
                  disabled={!feedback.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] hover:bg-[oklch(0.55_0.2_280)] text-white text-xs font-medium disabled:opacity-40 transition-colors"
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
              Revise
            </button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function EmailPage() {
  const [emailType, setEmailType] = useState<EmailType>("application");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jdMode, setJdMode] = useState<"pdf" | "text">("pdf");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (feedback?: string) => {
    if (!company.trim() || !role.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("type", emailType);
      form.append("company", company.trim());
      form.append("role", role.trim());
      if (jdMode === "pdf" && jdFile) form.append("jdFile", jdFile);
      if (jdMode === "text" && jdText.trim()) form.append("jd", jdText.trim());
      if (resumeFile) form.append("resumeFile", resumeFile);
      if (feedback && email) {
        form.append("feedback", feedback);
        form.append("previous", email);
      }

      const res = await fetch("/api/email", { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email generation failed");
    } finally {
      setGenerating(false);
    }
  }, [emailType, company, role, jdMode, jdFile, jdText, resumeFile, email]);

  const canGenerate = company.trim() && role.trim();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Email Composer</h1>
        <p className="mt-1.5 text-muted-foreground">
          Generate polished outreach and application emails tailored to your goals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-5">
          {/* Email type */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Email Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(EMAIL_TYPE_LABELS) as [EmailType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setEmailType(type)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium text-left transition-colors ${
                      emailType === type
                        ? "border-[oklch(0.6_0.2_280/50%)] bg-[oklch(0.6_0.2_280/10%)] text-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Company + Role */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Position Details</CardTitle>
              <CardDescription>Company and role you are targeting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Amazon, Microsoft, Salesforce"
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Solutions Architect, Customer Engineer"
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
                />
              </div>
            </CardContent>
          </Card>

          {/* JD */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Job Description</CardTitle>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <CardDescription>Attach or paste the JD to improve relevance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-1 p-1 rounded-lg bg-muted/40 w-fit">
                {(["pdf", "text"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setJdMode(mode)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      jdMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "pdf" ? "Upload PDF" : "Paste Text"}
                  </button>
                ))}
              </div>
              {jdMode === "pdf" ? (
                <DropZone
                  id="jd-pdf"
                  accept=".pdf"
                  file={jdFile}
                  onFile={setJdFile}
                  label="Drop JD PDF here or click to browse"
                />
              ) : (
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={6}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow"
                />
              )}
            </CardContent>
          </Card>

          {/* Resume */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Resume</CardTitle>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <CardDescription>Attach your resume to personalize the email.</CardDescription>
            </CardHeader>
            <CardContent>
              <DropZone
                id="resume-pdf"
                accept=".pdf"
                file={resumeFile}
                onFile={setResumeFile}
                label="Drop Resume PDF here or click to browse"
              />
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            onClick={() => generate()}
            disabled={!canGenerate || generating}
            className="w-full rounded-xl bg-[oklch(0.45_0.14_145)] hover:bg-[oklch(0.40_0.14_145)] text-white font-semibold py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" />Generating...</>
            ) : (
              <><Mail size={16} />Generate Email</>
            )}
          </button>
        </div>

        {/* Right: Result */}
        <div>
          {email ? (
            <EmailResult email={email} onRevise={(feedback) => generate(feedback)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground gap-3 rounded-xl border border-dashed border-border/40">
              <Mail size={32} className="opacity-20" />
              <p className="text-sm">Fill in the details and generate an email</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
