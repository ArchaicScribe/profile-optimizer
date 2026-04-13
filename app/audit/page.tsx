"use client";

import { useCallback, useRef, useState } from "react";
import { consumeSSE } from "../../lib/consumeSSE";
import { extractJson } from "../../lib/extractJson";
import type { AuditResult, ChatMessage, JDComparison, ResumeResult } from "../../lib/types";
import { Upload, Link2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, FileText, Wand2, Copy, Check, Send, MessageSquare, Bot, Sparkles, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";


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

const SOURCE_LABEL: Record<string, { label: string; className: string }> = {
  linkedin: { label: "LinkedIn", className: "border-blue-500/40 text-blue-400" },
  website:  { label: "Website",  className: "border-purple-500/40 text-purple-400" },
  both:     { label: "Both",     className: "border-muted-foreground/40 text-muted-foreground" },
};

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  contract_attractor: "text-destructive",
  location_attractor: "text-yellow-500",
  positive: "text-green-500",
  neutral: "text-muted-foreground",
};

type PhraseEntry = NonNullable<AuditResult["phrasesToAvoid"]>[0];

const PHRASE_CONTEXT_COLOR: Record<string, string> = {
  staffing_agency: "border-destructive/30 bg-destructive/5",
  geographic: "border-yellow-500/30 bg-yellow-500/5",
};
const PHRASE_LABEL_COLOR: Record<string, string> = {
  staffing_agency: "text-destructive",
  geographic: "text-yellow-500",
};

function ScoreRing({ score, label, sublabel }: { score: number; label: string; sublabel?: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, score / 100)) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const status = score >= 85 ? "SA Ready" : score >= 70 ? "Nearly There" : score >= 55 ? "Work Needed" : "Significant Gaps";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={104} height={104} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/20" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
        <text x="50" y="46" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="700" fill={color}>{score}</text>
        <text x="50" y="62" textAnchor="middle" dominantBaseline="central" fontSize="9" fill="currentColor" opacity="0.5">/ 100</text>
      </svg>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
        <p className="text-xs mt-1" style={{ color }}>{status}</p>
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  "What should I fix first?",
  "What's my biggest gap?",
  "How do I improve my SA positioning?",
  "What keywords am I missing?",
];

function AuditChatPanel({ auditResult, resumeResult }: { auditResult: AuditResult | null; resumeResult: ResumeResult | null }) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [showChips, setShowChips] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const sendChat = async (input: string) => {
    const question = input.trim();
    if (!question || chatLoading) return;
    setChatInput("");
    setShowChips(false);
    const userMsg: ChatMessage = { role: "user", content: question };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatLoading(true);
    setStreamingReply("");

    try {
      const res = await fetch("/api/audit-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          auditResult,
          resumeResult,
          history: chatHistory,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      let reply = "";
      await consumeSSE(res, (chunk) => {
        reply += chunk;
        setStreamingReply(reply);
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      });
      setChatHistory([...newHistory, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Request failed"}` }]);
    } finally {
      setChatLoading(false);
      setStreamingReply("");
    }
  };

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot size={16} className="text-[oklch(0.6_0.2_280)]" />
          Audit Coach
        </CardTitle>
        <CardDescription>Ask follow-up questions about your audit results to get specific coaching advice.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick-start chips */}
        {showChips && chatHistory.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendChat(prompt)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.6_0.2_280/30%)] bg-[oklch(0.6_0.2_280/6%)] px-3 py-1.5 text-xs font-medium text-[oklch(0.6_0.2_280)] hover:bg-[oklch(0.6_0.2_280/12%)] transition-colors"
              >
                <Sparkles size={10} />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Chat history */}
        {(chatHistory.length > 0 || (chatLoading && streamingReply)) && (
          <div ref={chatScrollRef} className="space-y-3 h-72 overflow-y-auto rounded-lg border border-border/40 bg-background/60 p-3">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[oklch(0.6_0.2_280)] text-white"
                    : "bg-card border border-border/60 text-foreground"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && streamingReply && (
              <div className="flex gap-2 justify-start">
                <div className="max-w-[88%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-card border border-border/60">
                  {streamingReply}
                  <span className="inline-block w-1.5 h-4 bg-[oklch(0.6_0.2_280)] ml-1 animate-pulse rounded-sm" />
                </div>
              </div>
            )}
            {chatLoading && !streamingReply && (
              <div className="flex justify-start">
                <div className="rounded-xl px-4 py-2.5 bg-card border border-border/60">
                  <Loader2 size={13} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
            placeholder="Ask about your audit results..."
            disabled={chatLoading}
            className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow disabled:opacity-50"
          />
          <button
            onClick={() => sendChat(chatInput)}
            disabled={!chatInput.trim() || chatLoading}
            className="inline-flex items-center justify-center rounded-lg bg-[oklch(0.6_0.2_280)] text-white w-9 h-9 shrink-0 hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function PhraseCard({ phrase: p }: { phrase: PhraseEntry }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const contextColor = PHRASE_CONTEXT_COLOR[p.context] ?? "border-border/60 bg-card/40";
  const labelColor = PHRASE_LABEL_COLOR[p.context] ?? "text-muted-foreground";

  const sendChat = async (input: string) => {
    const question = input.trim();
    if (!question || chatLoading) return;
    setChatInput("");
    const userMsg: ChatMessage = { role: "user", content: question };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatLoading(true);
    setStreamingReply("");

    try {
      const res = await fetch("/api/audit-rewrite-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          recommendation: {
            title: `Avoid phrase: "${p.phrase}"`,
            body: p.reason,
            priority: "high",
            category: p.context,
          },
          rewriteOutput: p.replacement ? `Suggested replacement: ${p.replacement}` : undefined,
          history: chatHistory,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      let reply = "";
      await consumeSSE(res, (chunk) => {
        reply += chunk;
        setStreamingReply(reply);
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      });
      setChatHistory([...newHistory, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Request failed"}` }]);
    } finally {
      setChatLoading(false);
      setStreamingReply("");
    }
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${contextColor}`}>
      {/* Header row: phrase + type badge */}
      <div className="flex items-start justify-between gap-2">
        <code className="text-sm font-mono font-semibold break-all">{p.phrase}</code>
        <span className={`text-[10px] font-medium uppercase tracking-wide shrink-0 ${labelColor}`}>
          {p.context.replace(/_/g, " ")}
        </span>
      </div>

      {/* Where it appears */}
      {(p.source || p.section) && (
        <div className="flex items-center gap-2 flex-wrap">
          {p.source && SOURCE_LABEL[p.source] && (
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-transparent ${SOURCE_LABEL[p.source].className}`}>
              {SOURCE_LABEL[p.source].label}
            </span>
          )}
          {p.section && (
            <span className="text-xs text-muted-foreground font-medium">{p.section}</span>
          )}
        </div>
      )}

      {/* Verbatim excerpt showing the phrase in context */}
      {p.excerpt && (
        <blockquote className="border-l-2 border-border/60 pl-3">
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            {p.excerpt.split(new RegExp(`(${p.phrase})`, "i")).map((part, i) =>
              part.toLowerCase() === p.phrase.toLowerCase()
                ? <mark key={i} className="bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 not-italic font-semibold rounded px-0.5">{part}</mark>
                : part
            )}
          </p>
        </blockquote>
      )}

      {/* Why it hurts */}
      <p className="text-sm text-muted-foreground leading-relaxed">{p.reason}</p>

      {/* Say instead */}
      {p.replacement && (
        <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-500 mb-1">Say instead</p>
          <p className="text-sm leading-relaxed">{p.replacement}</p>
        </div>
      )}

      {/* Chat toggle */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[oklch(0.6_0.2_280)] hover:text-[oklch(0.55_0.2_280)] transition-colors pt-0.5"
      >
        <MessageSquare size={11} />
        {chatOpen ? "Hide discussion" : "Discuss this"}
      </button>

      {/* Chat panel */}
      {chatOpen && (
        <div className="space-y-2 pt-1">
          {chatHistory.length > 0 && (
            <div ref={chatScrollRef} className="space-y-3 h-64 overflow-y-auto rounded-lg border border-border/40 bg-background/60 p-3">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[oklch(0.6_0.2_280)] text-white"
                      : "bg-card border border-border/60 text-foreground"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && streamingReply && (
                <div className="flex gap-2 justify-start">
                  <div className="max-w-[88%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-card border border-border/60">
                    {streamingReply}
                    <span className="inline-block w-1.5 h-4 bg-[oklch(0.6_0.2_280)] ml-1 animate-pulse rounded-sm" />
                  </div>
                </div>
              )}
              {chatLoading && !streamingReply && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-2.5 bg-card border border-border/60">
                    <Loader2 size={13} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
              placeholder="Where does this appear? What's a more specific alternative? Why does this hurt?"
              disabled={chatLoading}
              className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow disabled:opacity-50"
            />
            <button
              onClick={() => sendChat(chatInput)}
              disabled={!chatInput.trim() || chatLoading}
              className="inline-flex items-center justify-center rounded-lg bg-[oklch(0.6_0.2_280)] text-white w-9 h-9 shrink-0 hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: AuditResult["recommendations"][0] }) {
  const [open, setOpen] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const rewriteOutputRef = useRef<HTMLDivElement>(null);

  const generateRewrite = async () => {
    if (!currentText.trim()) return;
    setRewriting(true);
    setRewriteText("");
    setRewriteError(null);
    setChatHistory([]);
    try {
      const res = await fetch("/api/audit-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendation: rec, currentText: currentText.trim() }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      await consumeSSE(res, (chunk) => {
        setRewriteText((prev) => prev + chunk);
      });
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setRewriting(false);
    }
  };

  const sendChat = async (input: string) => {
    const question = input.trim();
    if (!question || chatLoading) return;
    setChatInput("");

    const userMsg: ChatMessage = { role: "user", content: question };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatLoading(true);
    setStreamingReply("");

    try {
      const res = await fetch("/api/audit-rewrite-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          recommendation: rec,
          currentText: currentText.trim(),
          rewriteOutput: rewriteText || undefined,
          history: chatHistory,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      let reply = "";
      await consumeSSE(res, (chunk) => {
        reply += chunk;
        setStreamingReply(reply);
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      });
      setChatHistory([...newHistory, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Request failed"}` }]);
    } finally {
      setChatLoading(false);
      setStreamingReply("");
    }
  };

  const parseRewrite = (raw: string): { rewritten: string; changes: string[] } => {
    const rewrittenMatch = raw.match(/REWRITTEN:\s*([\s\S]*?)(?=\nCHANGES:|$)/i);
    const changesMatch = raw.match(/CHANGES:\s*([\s\S]*)/i);
    const rewritten = rewrittenMatch?.[1]?.trim() ?? "";
    const changes = changesMatch?.[1]
      ?.split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean) ?? [];
    return { rewritten, changes };
  };

  const copyRewrite = () => {
    const { rewritten } = parseRewrite(rewriteText);
    navigator.clipboard.writeText(rewritten || rewriteText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          {rec.source && SOURCE_LABEL[rec.source] && (
            <Badge variant="outline" className={`text-xs shrink-0 ${SOURCE_LABEL[rec.source].className}`}>
              {SOURCE_LABEL[rec.source].label}
            </Badge>
          )}
          <span className="text-sm font-medium">{rec.title}</span>
        </div>
        {open ? <ChevronUp size={14} className="shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 mt-0.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5">
          <Separator className="mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground leading-relaxed">{rec.body}</p>

          {/* Rewrite + Chat section */}
          <div className="mt-4">
            <button
              onClick={() => { setRewriteOpen((v) => !v); setRewriteText(""); setRewriteError(null); setChatHistory([]); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[oklch(0.6_0.2_280)] hover:text-[oklch(0.55_0.2_280)] transition-colors"
            >
              <Wand2 size={12} />
              {rewriteOpen ? "Hide rewrite" : "Get a rewrite"}
            </button>

            {rewriteOpen && (
              <div className="mt-3 space-y-3">
                {/* Input text */}
                <textarea
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder="Paste the current text you want rewritten — summary, headline, bullet point, skills section, etc."
                  rows={4}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateRewrite(); } }}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow resize-y leading-relaxed"
                />
                <button
                  onClick={generateRewrite}
                  disabled={!currentText.trim() || rewriting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-4 py-1.5 text-xs font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
                >
                  {rewriting ? <><Loader2 size={11} className="animate-spin" />Rewriting...</> : <><Wand2 size={11} />Generate Rewrite</>}
                </button>

                {rewriteError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle size={12} />{rewriteError}
                  </p>
                )}

                {(rewriting || rewriteText) && (() => {
                  const { rewritten, changes } = rewriting ? { rewritten: "", changes: [] } : parseRewrite(rewriteText);
                  return (
                    <div ref={rewriteOutputRef} className="rounded-xl border border-[oklch(0.6_0.2_280/20%)] bg-[oklch(0.6_0.2_280/5%)] overflow-hidden">
                      {rewriting ? (
                        <div className="px-5 py-5 text-base leading-7 whitespace-pre-wrap tracking-normal text-foreground/80">
                          {rewriteText}
                          <span className="inline-block w-2 h-5 bg-[oklch(0.6_0.2_280)] ml-1 animate-pulse rounded-sm" />
                        </div>
                      ) : (
                        <>
                          <div className="px-5 pt-5 pb-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.6_0.2_280)]">Rewritten</span>
                              <button
                                onClick={copyRewrite}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                              >
                                {copied ? <><Check size={12} className="text-green-500" />Copied</> : <><Copy size={12} />Copy</>}
                              </button>
                            </div>
                            <p className="text-base leading-8 tracking-normal text-foreground whitespace-pre-wrap">
                              {rewritten || rewriteText}
                            </p>
                          </div>

                          {changes.length > 0 && (
                            <div className="px-5 pb-5 pt-3 border-t border-[oklch(0.6_0.2_280/12%)]">
                              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">What changed</span>
                              <ul className="space-y-2">
                                {changes.map((change, i) => (
                                  <li key={i} className="flex gap-2.5 items-start text-sm leading-relaxed text-foreground/80">
                                    <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[oklch(0.6_0.2_280/60%)]" />
                                    {change}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {(rewriteText || chatHistory.length > 0) && !rewriting && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare size={11} />
                      <span>Follow up — ask questions, request changes, or provide feedback</span>
                    </div>

                    {chatHistory.length > 0 && (
                      <div ref={chatScrollRef} className="space-y-3 h-64 overflow-y-auto rounded-lg border border-border/40 bg-muted/20 p-3">
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                              msg.role === "user"
                                ? "bg-[oklch(0.6_0.2_280)] text-white"
                                : "bg-card border border-border/60 text-foreground"
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {chatLoading && streamingReply && (
                          <div className="flex gap-2 justify-start">
                            <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-card border border-border/60">
                              {streamingReply}
                              <span className="inline-block w-1.5 h-4 bg-[oklch(0.6_0.2_280)] ml-1 animate-pulse rounded-sm" />
                            </div>
                          </div>
                        )}
                        {chatLoading && !streamingReply && (
                          <div className="flex gap-2 justify-start">
                            <div className="rounded-xl px-4 py-2.5 bg-card border border-border/60">
                              <Loader2 size={13} className="animate-spin text-muted-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
                        placeholder="Make it shorter… is this accurate for Databricks… keep the Kubernetes line…"
                        disabled={chatLoading}
                        className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow disabled:opacity-50"
                      />
                      <button
                        onClick={() => sendChat(chatInput)}
                        disabled={!chatInput.trim() || chatLoading}
                        className="inline-flex items-center justify-center rounded-lg bg-[oklch(0.6_0.2_280)] text-white w-9 h-9 shrink-0 hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AuditPage() {
  const [tab, setTab] = useState<"export" | "url" | "resume">("export");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeDragging, setResumeDragging] = useState(false);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdDragging, setJdDragging] = useState(false);
  const [jdText, setJdText] = useState("");
  const [jdMode, setJdMode] = useState<"pdf" | "text">("text");
  const [url, setUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamChunks, setStreamChunks] = useState<string[]>([]);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [recSourceFilter, setRecSourceFilter] = useState<"all" | keyof typeof SOURCE_LABEL>("all");
  const [resumeResult, setResumeResult] = useState<ResumeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".zip")) setFile(dropped);
  }, []);

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setResumeDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".pdf")) setResumeFile(dropped);
  }, []);

  const handleJdDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setJdDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".pdf")) setJdFile(dropped);
  }, []);

  const runAudit = async () => {
    setError(null);
    setStreamChunks([]);
    setResult(null);
    setResumeResult(null);
    setStreaming(true);

    if (tab === "resume") {
      if (!resumeFile) {
        setError("Please upload a PDF resume.");
        setStreaming(false);
        return;
      }
      const form = new FormData();
      form.append("file", resumeFile);
      if (jdMode === "pdf" && jdFile) form.append("jd", jdFile);
      if (jdMode === "text" && jdText.trim()) form.append("jdText", jdText.trim());
      try {
        const res = await fetch("/api/resume", { method: "POST", body: form });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(error ?? `HTTP ${res.status}`);
        }
        const accumulated = await consumeSSE(res, (chunk) => {
          setStreamChunks((prev) => [...prev, chunk]);
          requestAnimationFrame(() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" }));
        });
        try {
          const parsed = extractJson<ResumeResult>(accumulated);
          setResumeResult({
            ...parsed,
            strengths: parsed.strengths ?? [],
            weaknesses: parsed.weaknesses ?? [],
            rewrites: parsed.rewrites ?? [],
            missing: parsed.missing ?? [],
            redFlags: parsed.redFlags ?? [],
            nextSteps: parsed.nextSteps ?? [],
          });
        } catch { /* show raw chunks */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Resume analysis failed");
      } finally {
        setStreaming(false);
      }
      return;
    }

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
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      const accumulated = await consumeSSE(res, (chunk) => {
        setStreamChunks((prev) => [...prev, chunk]);
        requestAnimationFrame(() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" }));
      });
      try {
        const parsed = extractJson<AuditResult>(accumulated);
        setResult({
          ...parsed,
          signals: parsed.signals ?? [],
          recommendations: parsed.recommendations ?? [],
          phrasesToAvoid: parsed.phrasesToAvoid ?? [],
        });
      } catch { /* show raw chunks */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setStreaming(false);
    }
  };

  const linkedinScore = result ? (result.linkedinScore ?? result.auditScore) : 0;
  const scoreList = result ? [linkedinScore, ...(result.websiteScore != null ? [result.websiteScore] : []), ...(resumeResult ? [resumeResult.score] : [])] : [];
  const overallScore = scoreList.length > 0 ? Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length) : 0;
  const positiveSignals = result ? (result.signals ?? []).filter((s) => s.type === "positive") : [];
  const negativeSignals = result ? (result.signals ?? []).filter((s) => s.type !== "positive") : [];

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
          <CardTitle className="text-base">Profile Data</CardTitle>
          <CardDescription>Upload your LinkedIn export, provide a URL, or analyze your resume for SA positioning.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "export" | "url" | "resume")}>
            <TabsList className="mb-5">
              <TabsTrigger value="export" className="gap-1.5"><Upload size={13} />LinkedIn Export</TabsTrigger>
              <TabsTrigger value="url" className="gap-1.5"><Link2 size={13} />URL Audit</TabsTrigger>
              <TabsTrigger value="resume" className="gap-1.5"><FileText size={13} />Resume</TabsTrigger>
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
                  onKeyDown={(e) => e.key === "Enter" && !streaming && runAudit()}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow" />
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">URL to audit</label>
                <input type="url" placeholder="https://yoursite.dev" value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !streaming && runAudit()}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow" />
              </div>
            </TabsContent>

            <TabsContent value="resume" className="space-y-5">
              {/* Resume drop zone */}
              <div>
                <p className="text-sm font-medium mb-2">Resume PDF <span className="text-destructive">*</span></p>
                <div
                  onDrop={handleResumeDrop}
                  onDragOver={(e) => { e.preventDefault(); setResumeDragging(true); }}
                  onDragLeave={() => setResumeDragging(false)}
                  onClick={() => document.getElementById("pdf-input")?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    resumeDragging
                      ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
                      : resumeFile
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-border/60 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
                  }`}
                >
                  <input id="pdf-input" type="file" accept=".pdf" className="hidden"
                    onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
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
                      <p className="text-xs text-muted-foreground">Analyzed for SE/SA/CA/CE positioning at your target companies</p>
                    </div>
                  )}
                </div>
              </div>

              {/* JD section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Job Description <span className="text-muted-foreground font-normal">(optional — enables JD fit analysis)</span></p>
                  <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5 bg-muted/30">
                    <button
                      onClick={() => setJdMode("text")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${jdMode === "text" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Paste Text
                    </button>
                    <button
                      onClick={() => setJdMode("pdf")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${jdMode === "pdf" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Upload PDF
                    </button>
                  </div>
                </div>

                {jdMode === "text" ? (
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste job description here..."
                    rows={6}
                    className="w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow resize-y leading-relaxed"
                  />
                ) : (
                  <div
                    onDrop={handleJdDrop}
                    onDragOver={(e) => { e.preventDefault(); setJdDragging(true); }}
                    onDragLeave={() => setJdDragging(false)}
                    onClick={() => document.getElementById("jd-pdf-input")?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                      jdDragging
                        ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/8%)]"
                        : jdFile
                        ? "border-green-500/40 bg-green-500/5"
                        : "border-border/60 hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
                    }`}
                  >
                    <input id="jd-pdf-input" type="file" accept=".pdf" className="hidden"
                      onChange={(e) => setJdFile(e.target.files?.[0] ?? null)} />
                    {jdFile ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <CheckCircle2 size={20} className="text-green-500" />
                        <p className="text-sm font-medium">{jdFile.name}</p>
                        <p className="text-xs text-muted-foreground">Click to replace</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <Upload size={20} className="text-muted-foreground" />
                        <p className="text-sm font-medium">Drop JD PDF here</p>
                        <p className="text-xs text-muted-foreground">or click to browse</p>
                      </div>
                    )}
                  </div>
                )}
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
            {streaming ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : tab === "resume" ? "Analyze Resume" : "Run Audit"}
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

      {/* Resume results */}
      {resumeResult && (
        <div className="space-y-8">
          {/* Score */}
          <Card className="border-border/60 bg-card/60">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <span className={`text-5xl font-bold tabular-nums ${
                    resumeResult.score >= 75 ? "text-green-500" : resumeResult.score >= 50 ? "text-yellow-500" : "text-destructive"
                  }`}>{resumeResult.score}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">SE/SA/CA Score</span>
                </div>
                <div className="flex-1 space-y-2">
                  <Progress value={resumeResult.score} className="h-2" />
                  <p className="text-sm font-medium">{resumeResult.headline}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JD Comparison */}
          {resumeResult.jdComparison && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">JD Fit Analysis</h2>
                <Card className="border-[oklch(0.6_0.2_280/30%)] bg-[oklch(0.6_0.2_280/5%)]">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-6 mb-4">
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <span className={`text-4xl font-bold tabular-nums ${
                          resumeResult.jdComparison.fitScore >= 75 ? "text-green-500" : resumeResult.jdComparison.fitScore >= 50 ? "text-yellow-500" : "text-destructive"
                        }`}>{resumeResult.jdComparison.fitScore}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">JD Fit</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Progress value={resumeResult.jdComparison.fitScore} className="h-2" />
                        <p className="text-sm italic text-muted-foreground">{resumeResult.jdComparison.verdict}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resumeResult.jdComparison.matched.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-green-500">Matched ({resumeResult.jdComparison.matched.length})</p>
                          <ul className="space-y-1">
                            {resumeResult.jdComparison.matched.map((m, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-green-500 mt-0.5 shrink-0">✓</span>{m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {resumeResult.jdComparison.gaps.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Gaps ({resumeResult.jdComparison.gaps.length})</p>
                          <ul className="space-y-1">
                            {resumeResult.jdComparison.gaps.map((g, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-destructive mt-0.5 shrink-0">✗</span>{g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {resumeResult.jdComparison.tailoringTips.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tailoring Tips</p>
                        <ul className="space-y-1.5">
                          {resumeResult.jdComparison.tailoringTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-[oklch(0.6_0.2_280)] mt-0.5 shrink-0">→</span>{tip}
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
            {resumeResult.strengths.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Strengths
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{resumeResult.strengths.length}</span>
                </h2>
                <div className="space-y-2">
                  {resumeResult.strengths.map((s, i) => (
                    <div key={i} className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">{s.point}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resumeResult.weaknesses.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Weaknesses
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{resumeResult.weaknesses.length}</span>
                </h2>
                <div className="space-y-2">
                  {resumeResult.weaknesses.map((w, i) => (
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
          {resumeResult.rewrites.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Bullet Rewrites
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{resumeResult.rewrites.length}</span>
                </h2>
                <div className="space-y-4">
                  {resumeResult.rewrites.map((r, i) => (
                    <Card key={i} className="border-border/60 bg-card/60">
                      <CardContent className="pt-4 pb-4 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Before</p>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">{r.original}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-500">After</p>
                          <p className="text-sm leading-relaxed">{r.rewritten}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                          <p className="text-sm text-muted-foreground leading-relaxed">{r.reason}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Missing + Red Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumeResult.missing.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Missing
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{resumeResult.missing.length}</span>
                </h2>
                <div className="space-y-2">
                  {resumeResult.missing.map((m, i) => (
                    <div key={i} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{m.item}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{m.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resumeResult.redFlags.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Red Flags
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{resumeResult.redFlags.length}</span>
                </h2>
                <div className="space-y-2">
                  {resumeResult.redFlags.map((f, i) => (
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
          {resumeResult.nextSteps.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Next Steps</h2>
                <ol className="space-y-2">
                  {resumeResult.nextSteps.map((step, i) => (
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

      {/* Structured results */}
      {result && (
        <div className="space-y-8">
          {/* SA Readiness Dashboard */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target size={16} className="text-[oklch(0.6_0.2_280)]" />
                SA Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <>
                <div className="flex flex-wrap justify-center gap-12">
                  <ScoreRing score={linkedinScore} label="LinkedIn Profile" sublabel="SE/SA positioning" />
                  {result.websiteScore != null && (
                    <ScoreRing score={result.websiteScore} label="Personal Website" sublabel="SE/SA positioning" />
                  )}
                  {resumeResult && (
                    <ScoreRing score={resumeResult.score} label="Resume" sublabel="SE/SA positioning" />
                  )}
                  <ScoreRing score={overallScore} label="Overall" sublabel="composite score" />
                </div>
                {result.summary && (
                  <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto">{result.summary}</p>
                )}
              </>
            </CardContent>
          </Card>

          <Separator className="opacity-50" />

          {(result.signals?.length ?? 0) > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Detected Signals
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{result.signals!.length}</span>
              </h2>
              {positiveSignals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-green-500 uppercase tracking-wide">Positive Signals ({positiveSignals.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {positiveSignals.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                        <Badge variant={PRIORITY_VARIANT[s.severity] ?? "outline"} className="shrink-0 text-xs mt-0.5">
                          {s.severity}
                        </Badge>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {negativeSignals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide">Risk Signals ({negativeSignals.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {negativeSignals.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 hover:border-border transition-colors">
                        <Badge variant={PRIORITY_VARIANT[s.severity] ?? "outline"} className="shrink-0 text-xs mt-0.5">
                          {s.severity}
                        </Badge>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium capitalize ${SIGNAL_TYPE_COLOR[s.type] ?? ""}`}>
                            {s.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Recommendations */}
          {(result.recommendations?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Recommendations
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{result.recommendations?.length ?? 0}</span>
                </h2>
                <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5 bg-muted/30">
                  {(["all", "linkedin", "website", "both"] as const).map((f) => (
                    <button key={f} onClick={() => setRecSourceFilter(f)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                        recSourceFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {f === "all" ? "All" : SOURCE_LABEL[f]?.label ?? f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {(result.recommendations ?? [])
                  .filter((r) => recSourceFilter === "all" || !r.source || r.source === recSourceFilter)
                  .map((r, i) => (
                  <RecommendationCard key={i} rec={r} />
                ))}
              </div>
            </div>
          )}

          {/* Phrases to Avoid */}
          {result.phrasesToAvoid && result.phrasesToAvoid.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Phrases to Avoid
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{result.phrasesToAvoid.length}</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  These words and phrases attract staffing agencies, contract recruiters, or undesired geographic matches. Remove or rephrase them.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.phrasesToAvoid.map((p, i) => (
                    <PhraseCard key={i} phrase={p} />
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator className="opacity-50" />

          {/* Audit Coach Chat */}
          <AuditChatPanel auditResult={result} resumeResult={resumeResult} />
        </div>
      )}
    </div>
  );
}
