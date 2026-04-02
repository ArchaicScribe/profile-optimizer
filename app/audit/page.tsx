"use client";

import { useCallback, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface AuditResult {
  auditScore: number;
  signals: Array<{ text: string; type: string; severity: string }>;
  recommendations: Array<{
    title: string;
    body: string;
    priority: string;
    category: string;
  }>;
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

export default function AuditPage() {
  const [tab, setTab] = useState<"export" | "url">("export");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [rawStream, setRawStream] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".zip")) setFile(dropped);
  }, []);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const runAudit = async () => {
    setError(null);
    setRawStream("");
    setResult(null);
    setStreaming(true);

    const form = new FormData();
    if (tab === "export" && file) {
      form.append("file", file);
      if (siteUrl) form.append("siteUrl", siteUrl);
    } else if (tab === "url" && url) {
      form.append("url", url);
    } else {
      setError(
        tab === "export"
          ? "Please upload your LinkedIn export ZIP."
          : "Please enter a URL."
      );
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
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;

          const parsed = JSON.parse(data);
          if (parsed.error) {
            setError(parsed.error);
            break;
          }
          if (parsed.chunk) {
            accumulated += parsed.chunk;
            setRawStream(accumulated);
          }
        }
      }

      // Extract JSON from the streamed response
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          setResult(JSON.parse(jsonMatch[0]));
        } catch {
          // JSON parse failed — show raw output
        }
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
        <h1 className="text-3xl font-bold tracking-tight">Profile Audit</h1>
        <p className="mt-1 text-muted-foreground">
          Analyze your LinkedIn profile for signals attracting the wrong
          recruiters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
          <CardDescription>
            Choose how to provide your profile data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "export" | "url")}>
            <TabsList className="mb-4">
              <TabsTrigger value="export">LinkedIn Export</TabsTrigger>
              <TabsTrigger value="url">URL Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-4">
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() =>
                  document.getElementById("zip-input")?.click()
                }
                className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-muted-foreground transition-colors"
              >
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drop your LinkedIn export ZIP here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Settings → Data Privacy → Get a copy of your data
                    </p>
                  </div>
                )}
                <input
                  id="zip-input"
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Personal site URL{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="url"
                  placeholder="https://yoursite.dev"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">URL to audit</label>
                <input
                  type="url"
                  placeholder="https://yoursite.dev"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}

          <button
            onClick={runAudit}
            disabled={streaming}
            className="mt-4 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {streaming ? "Analyzing..." : "Run Audit"}
          </button>
        </CardContent>
      </Card>

      {/* Streaming output */}
      {(streaming || rawStream) && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Analysis
              {streaming && (
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
              {rawStream}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Structured results */}
      {result && (
        <div className="space-y-6">
          {/* Score */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`text-5xl font-bold tabular-nums ${
                  result.auditScore >= 75
                    ? "text-green-500"
                    : result.auditScore >= 50
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {result.auditScore}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                Score
              </span>
            </div>
            <div className="flex-1 space-y-1">
              <Progress value={result.auditScore} className="h-2" />
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </div>
          </div>

          <Separator />

          {/* Signals */}
          {result.signals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Detected Signals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.signals.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-md border border-border p-3"
                  >
                    <Badge
                      variant={PRIORITY_VARIANT[s.severity] ?? "outline"}
                      className="shrink-0 text-xs"
                    >
                      {s.severity}
                    </Badge>
                    <div>
                      <p className="text-xs font-medium capitalize">
                        {s.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recommendations
              </h2>
              <div className="space-y-3">
                {result.recommendations.map((r, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={PRIORITY_VARIANT[r.priority] ?? "outline"}
                          className="text-xs"
                        >
                          {r.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABEL[r.category] ?? r.category}
                        </Badge>
                        <CardTitle className="text-sm">{r.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{r.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
