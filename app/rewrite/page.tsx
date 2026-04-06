"use client";

import { useRef, useState } from "react";
import { consumeSSE } from "../../lib/consumeSSE";
import { extractJson } from "../../lib/extractJson";
import type { HeadlineVariant, SummaryVariant, RewriteResult } from "../../lib/types";
import { CopyButton } from "@/components/ui/copy-button";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function HeadlineCard({ variant, index }: { variant: HeadlineVariant; index: number }) {
  const [open, setOpen] = useState(true);
  const charCount = variant.text.length;

  return (
    <Card className="border-border/60 bg-card/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">
            Variant {index + 1}
          </Badge>
          <span className="text-sm font-medium truncate">{variant.text}</span>
        </div>
        {open ? (
          <ChevronUp size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4">
          <Separator className="opacity-50" />
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-relaxed">{variant.text}</p>
              <CopyButton text={variant.text} />
            </div>
            <p className={`text-xs tabular-nums ${charCount > 220 ? "text-destructive" : "text-muted-foreground"}`}>
              {charCount} / 220 characters{charCount > 220 ? " — exceeds LinkedIn limit" : ""}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{variant.rationale}</p>
          </div>
          {variant.signals.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SE/SA Signals</p>
              <div className="flex flex-wrap gap-1.5">
                {variant.signals.map((signal, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs border-[oklch(0.6_0.2_280/30%)] text-[oklch(0.6_0.2_280)] bg-[oklch(0.6_0.2_280/8%)]"
                  >
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SummaryCard({ variant, index }: { variant: SummaryVariant; index: number }) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="border-border/60 bg-card/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">
            Variant {index + 1}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground truncate">{variant.rationale}</span>
        </div>
        {open ? (
          <ChevronUp size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4">
          <Separator className="opacity-50" />
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{variant.text}</p>
              <CopyButton text={variant.text} />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strategic Angle</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{variant.rationale}</p>
          </div>
          {variant.keyChanges.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Changes</p>
              <ul className="space-y-1.5">
                {variant.keyChanges.map((change, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[oklch(0.6_0.2_280/15%)] text-[9px] font-bold text-[oklch(0.6_0.2_280)] mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{change}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function RewritePage() {
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamChunks, setStreamChunks] = useState<string[]>([]);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const headlineCount = headline.length;

  const handleSubmit = async () => {
    if (!headline.trim() || !summary.trim()) {
      setError("Both headline and summary are required.");
      return;
    }

    setError(null);
    setStreamChunks([]);
    setResult(null);
    setStreaming(true);

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline: headline.trim(), summary: summary.trim() }),
      });

      const accumulated = await consumeSSE(res, (chunk) => {
        setStreamChunks((prev) => [...prev, chunk]);
        setTimeout(() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" }), 10);
      });
      try { setResult(extractJson(accumulated)); } catch { /* leave raw stream visible */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Profile Rewriter</h1>
        <p className="mt-1.5 text-muted-foreground">
          Generate SE/SA/CA-optimized LinkedIn headline and About section variants.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Your Current Profile</CardTitle>
          <CardDescription>Paste your existing LinkedIn headline and About section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Current Headline</label>
              <span
                className={`text-xs tabular-nums ${
                  headlineCount > 220 ? "text-destructive font-medium" : "text-muted-foreground"
                }`}
              >
                {headlineCount} / 220
                {headlineCount > 220 && " — over limit"}
              </span>
            </div>
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              rows={2}
              placeholder="e.g. Senior Software Engineer at Acme Corp | Java | AWS | Kubernetes"
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current About / Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={8}
              placeholder="Paste your current LinkedIn About section here..."
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow resize-y leading-relaxed"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <span className="shrink-0 font-semibold">Error:</span>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={streaming}
            className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-5 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
          >
            {streaming ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Rewrites"
            )}
          </button>
        </CardContent>
      </Card>

      {(streaming || streamChunks.length > 0) && !result && (
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Generating
              {streaming && (
                <span className="inline-block h-2 w-2 rounded-full bg-[oklch(0.6_0.2_280)] animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={streamRef}
              className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg p-4 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap border border-border/40"
            >
              {streamChunks.join("")}
              {streaming && (
                <span className="inline-block w-1.5 h-3.5 bg-[oklch(0.6_0.2_280)] ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-10">
          {result.headlines.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Headlines</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {result.headlines.length} variant{result.headlines.length !== 1 ? "s" : ""} — max 220 characters
                </p>
              </div>
              <div className="space-y-3">
                {result.headlines.map((variant, i) => (
                  <HeadlineCard key={i} variant={variant} index={i} />
                ))}
              </div>
            </div>
          )}

          {result.headlines.length > 0 && result.summaries.length > 0 && (
            <Separator className="opacity-50" />
          )}

          {result.summaries.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">About / Summary</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {result.summaries.length} variant{result.summaries.length !== 1 ? "s" : ""} — full About section rewrites
                </p>
              </div>
              <div className="space-y-3">
                {result.summaries.map((variant, i) => (
                  <SummaryCard key={i} variant={variant} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
