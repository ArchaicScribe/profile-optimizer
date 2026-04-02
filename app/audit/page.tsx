"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Link2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface AuditResult {
  auditScore: number;
  signals: Array<{ text: string; type: string; severity: string }>;
  recommendations: Array<{ title: string; body: string; priority: string; category: string }>;
  summary: string;
}

const PRIORITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const CATEGORY_LABEL: Record<string, string> = {
  keywords: "Keywords",
  location: "Location",
  tone: "Tone",
  experience: "Experience",
  skills: "Skills",
};

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  contract_attractor: "text-destructive",
  location_attractor: "text-yellow-500",
  positive: "text-green-500",
  neutral: "text-muted-foreground",
};

function RecommendationCard({ rec }: { rec: AuditResult["recommendations"][0] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-border/60 bg-card/60 transition-all duration-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={PRIORITY_VARIANT[rec.priority] ?? "outline"} className="text-xs shrink-0">
            {rec.priority}
          </Badge>
          <Badge variant="outline" className="text-xs shrink-0">
            {CATEGORY_LABEL[rec.category] ?? rec.category}
          </Badge>
          <span className="text-sm font-medium">{rec.title}</span>
        </div>
        {open ? <ChevronUp size={14} className="shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 mt-0.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <Separator className="mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground leading-relaxed">{rec.body}</p>
        </div>
      )}
    </Card>
  );
}

export default function AuditPage() {
  const [tab, setTab] = useState<"export" | "url">("export");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamChunks, setStreamChunks] = useState<string[]>([]);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".zip")) setFile(dropped);
  }, []);

  const runAudit = async () => {
    setError(null);
    setStreamChunks([]);
    setResult(null);
    setStreaming(true);

    const form = new FormData();
    if (tab === "export" && file) {
      form.append("file", file);
      if (siteUrl) form.append("siteUrl", siteUrl);
    } else if (tab === "url" && url) {
      form.append("url", url);
    } else {
      setError(tab === "export" ? "Please upload your LinkedIn export ZIP." : "Please enter a URL.");
      setStreaming(false);
      return;
    }

    try {
      const res = await fetch("/api/audit", { method: "POST", body: form });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          const parsed = JSON.parse(data);
          if (parsed.error) { setError(parsed.error); break; }
          if (parsed.chunk) {
            accumulated += parsed.chunk;
            setStreamChunks((prev) => [...prev, parsed.chunk]);
            setTimeout(() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" }), 10);
          }
        }
      }

      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { setResult(JSON.parse(jsonMatch[0])); } catch { /* show raw */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Profile Audit</h1>
        <p className="mt-1.5 text-muted-foreground">
          Analyze your LinkedIn profile for signals attracting the wrong recruiters.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
          <CardDescription>Choose how to provide your profile data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "export" | "url")}>
            <TabsList className="mb-5">
              <TabsTrigger value="export" className="gap-1.5"><Upload size={13} />LinkedIn Export</TabsTrigger>
              <TabsTrigger value="url" className="gap-1.5"><Link2 size={13} />URL Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => document.getElementById("zip-input")?.click()}
                className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
                    : file
                    ? "border-green-500/40 bg-green-500/5"
                    : "border-border/60 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
                }`}
              >
                <input id="zip-input" type="file" accept=".zip" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 size={24} className="text-green-500" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} className="text-muted-foreground" />
                    <p className="text-sm font-medium">Drop your LinkedIn export ZIP here</p>
                    <p className="text-xs text-muted-foreground">
                      LinkedIn → Settings → Data Privacy → Download your data
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Personal site URL <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input type="url" placeholder="https://yoursite.dev" value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow" />
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">URL to audit</label>
                <input type="url" placeholder="https://yoursite.dev" value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow" />
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button onClick={runAudit} disabled={streaming}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-5 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors">
            {streaming ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : "Run Audit"}
          </button>
        </CardContent>
      </Card>

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
            <div ref={streamRef}
              className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg p-4 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap border border-border/40">
              {streamChunks.join("")}
              {streaming && <span className="inline-block w-1.5 h-3.5 bg-[oklch(0.6_0.2_280)] ml-0.5 animate-pulse rounded-sm" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Structured results */}
      {result && (
        <div className="space-y-8">
          {/* Score bar */}
          <Card className="border-border/60 bg-card/60">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <span className={`text-5xl font-bold tabular-nums ${
                    result.auditScore >= 75 ? "text-green-500" : result.auditScore >= 50 ? "text-yellow-500" : "text-destructive"
                  }`}>{result.auditScore}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Score</span>
                </div>
                <div className="flex-1 space-y-2">
                  <Progress value={result.auditScore} className="h-2" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="opacity-50" />

          {/* Signals */}
          {result.signals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detected Signals ({result.signals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.signals.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 hover:border-border transition-colors">
                    <Badge variant={PRIORITY_VARIANT[s.severity] ?? "outline"} className="shrink-0 text-xs mt-0.5">
                      {s.severity}
                    </Badge>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium capitalize ${SIGNAL_TYPE_COLOR[s.type] ?? ""}`}>
                        {s.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recommendations ({result.recommendations.length})
              </h2>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <RecommendationCard key={i} rec={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
