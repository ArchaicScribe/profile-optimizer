"use client";

import { useEffect, useRef, useState } from "react";
import { consumeSSE } from "../../lib/consumeSSE";
import type { RoleType, InterviewConfig, MessageRole, AppState, MockMessage } from "../../lib/types";
import { ScoreBadge } from "@/components/ui/score-badge";
import { Loader2, Mic, Send, RotateCcw, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const ROLE_TYPE_LABELS: Record<RoleType, string> = {
  behavioral: "Behavioral",
  system_design: "System Design",
  cloud_architecture: "Cloud Architecture",
  mixed: "Mixed",
};

function extractScore(text: string): number | undefined {
  const match = text.match(/Score:\s*(\d{1,3})/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 0 && n <= 100) return n;
  }
  return undefined;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default function MockPage() {
  const [appState, setAppState] = useState<AppState>("setup");
  const [config, setConfig] = useState<InterviewConfig>({
    company: "",
    roleType: "mixed",
    questionCount: 5,
  });
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [candidateInput, setCandidateInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [averageScore, setAverageScore] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, streaming]);

  function autoResizeTextarea() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  async function startInterview() {
    if (!config.company.trim()) return;

    setMessages([]);
    setQuestionsAsked(0);
    setStreamingText("");
    setAppState("interview");

    await callApi([], true);
  }

  async function sendResponse() {
    const text = candidateInput.trim();
    if (!text || streaming) return;

    const candidateMsg: MockMessage = { role: "candidate", content: text };
    const updatedMessages = [...messages, candidateMsg];
    setMessages(updatedMessages);
    setCandidateInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    await callApi(updatedMessages, false);
  }

  async function callApi(currentMessages: MockMessage[], isFirst: boolean) {
    setStreaming(true);
    setStreamingText("");

    const apiMessages = currentMessages
      .filter((m) => m.role === "interviewer" || m.role === "candidate")
      .map((m) => ({ role: m.role as "interviewer" | "candidate", content: m.content }));

    try {
      const res = await fetch("/api/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, config }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const accumulated = await consumeSSE(res, (_, acc) => setStreamingText(acc));

      setStreamingText("");
      setStreaming(false);

      // Detect END_SESSION
      const hasEnd = accumulated.includes("END_SESSION");
      const displayText = accumulated.replace(/\n?END_SESSION\n?/g, "").trim();

      const newQuestionsAsked = questionsAsked + 1;
      setQuestionsAsked(newQuestionsAsked);

      if (isFirst) {
        // First turn: just the question, no feedback
        const msg: MockMessage = { role: "interviewer", content: displayText };
        setMessages([msg]);
      } else {
        // Subsequent turns: extract feedback score and add as interviewer message
        const score = extractScore(displayText);
        const msg: MockMessage = { role: "interviewer", content: displayText, score };
        setMessages((prev) => [...prev, msg]);
      }

      if (hasEnd) {
        finishInterview([...currentMessages]);
      }
    } catch {
      setStreaming(false);
      setStreamingText("");
    }
  }

  function finishInterview(finalMessages: MockMessage[]) {
    setAppState("complete");

    // Compute average score from all interviewer messages that have a score
    const allMsgs = [...finalMessages, ...messages];
    const scores = allMsgs
      .filter((m) => m.score !== undefined)
      .map((m) => m.score as number);

    if (scores.length > 0) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      setAverageScore(avg);
    } else {
      setAverageScore(null);
    }
  }

  function endEarly() {
    setAppState("complete");
    const scores = messages
      .filter((m) => m.score !== undefined)
      .map((m) => m.score as number);
    if (scores.length > 0) {
      setAverageScore(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
    } else {
      setAverageScore(null);
    }
  }

  function resetInterview() {
    setAppState("setup");
    setMessages([]);
    setQuestionsAsked(0);
    setCandidateInput("");
    setStreamingText("");
    setAverageScore(null);
    setConfig({ company: "", roleType: "mixed", questionCount: 5 });
  }

  // ── Setup state ──────────────────────────────────────────────────────────────
  if (appState === "setup") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Mock Interview</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Simulate a real SE/SA/CA interview loop at your target companies.
          </p>
        </div>

        <Card className="border-border/60 bg-card/60 max-w-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Configure your interview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <input
                type="text"
                placeholder="e.g. Snowflake, Databricks, AWS..."
                value={config.company}
                onChange={(e) => setConfig((c) => ({ ...c, company: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") startInterview();
                }}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
              />
            </div>

            {/* Interview type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Interview Type</label>
              <div className="flex flex-wrap gap-2">
                {(["behavioral", "system_design", "cloud_architecture", "mixed"] as RoleType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setConfig((c) => ({ ...c, roleType: type }))}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        config.roleType === type
                          ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/12%)] text-[oklch(0.65_0.18_280)]"
                          : "border-border/60 text-muted-foreground hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
                      }`}
                    >
                      {ROLE_TYPE_LABELS[type]}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Question count */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Questions</label>
              <div className="flex gap-2">
                {([5, 8] as (5 | 8)[]).map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, questionCount: n }))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      config.questionCount === n
                        ? "border-[oklch(0.6_0.2_280/60%)] bg-[oklch(0.6_0.2_280/12%)] text-[oklch(0.65_0.18_280)]"
                        : "border-border/60 text-muted-foreground hover:border-[oklch(0.6_0.2_280/40%)] hover:bg-[oklch(0.6_0.2_280/4%)]"
                    }`}
                  >
                    {n} Questions
                  </button>
                ))}
              </div>
            </div>

            <Separator className="opacity-40" />

            <button
              onClick={startInterview}
              disabled={!config.company.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-5 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Mic size={15} />
              Start Interview
              <ChevronRight size={14} />
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Complete state ───────────────────────────────────────────────────────────
  if (appState === "complete") {
    const allScores = messages
      .filter((m) => m.score !== undefined)
      .map((m) => m.score as number);
    const computedAvg =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : averageScore;

    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Interview Complete</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {config.company} &middot; {ROLE_TYPE_LABELS[config.roleType]} &middot;{" "}
              {config.questionCount} questions
            </p>
          </div>
          <button
            onClick={resetInterview}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <RotateCcw size={13} />
            Start New Interview
          </button>
        </div>

        {computedAvg !== null && (
          <Card className="border-border/60 bg-card/60 max-w-xl">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">Average Score</div>
                <ScoreBadge score={computedAvg} outOf />
                {allScores.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    across {allScores.length} evaluated answer{allScores.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transcript
          </p>
          {messages.map((msg, i) => {
            if (msg.role === "candidate") {
              return (
                <div key={i} className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground pr-1">You</span>
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[oklch(0.6_0.2_280/10%)] border border-[oklch(0.6_0.2_280/20%)] px-4 py-3 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex flex-col items-start gap-1">
                <span className="text-xs text-muted-foreground pl-1">Interviewer</span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 border border-border/40 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                  {msg.score !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <ScoreBadge score={msg.score} outOf />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Interview state ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-xs border-[oklch(0.6_0.2_280/40%)] text-[oklch(0.65_0.18_280)]"
          >
            {config.company}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {ROLE_TYPE_LABELS[config.roleType]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Question {Math.min(questionsAsked, config.questionCount)} of {config.questionCount}
          </span>
        </div>
        <button
          onClick={endEarly}
          disabled={streaming}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
        >
          End Interview Early
        </button>
      </div>

      <Separator className="opacity-40 shrink-0" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.map((msg, i) => {
          if (msg.role === "candidate") {
            return (
              <div key={i} className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground pr-1">You</span>
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[oklch(0.6_0.2_280/10%)] border border-[oklch(0.6_0.2_280/20%)] px-4 py-3 text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            );
          }

          // Interviewer message — may contain feedback + next question
          const hasFeedback = i > 0 && msg.role === "interviewer";

          return (
            <div key={i} className="flex flex-col items-start gap-2">
              {hasFeedback && msg.score !== undefined ? (
                <>
                  {/* Feedback block */}
                  <div className="w-full max-w-[85%] rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-yellow-500/80 uppercase tracking-wide">
                        Feedback
                      </span>
                      <ScoreBadge score={msg.score} outOf />
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground pl-1">Interviewer</span>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 border border-border/40 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Streaming indicator */}
        {streaming && (
          <div className="flex flex-col items-start gap-1">
            <span className="text-xs text-muted-foreground pl-1">Interviewer</span>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 border border-border/40 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {streamingText ? (
                <>
                  {streamingText}
                  <span className="inline-block w-1.5 h-3.5 bg-[oklch(0.6_0.2_280)] ml-0.5 animate-pulse rounded-sm align-middle" />
                </>
              ) : (
                <TypingIndicator />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 space-y-2 pt-2">
        <Separator className="opacity-40" />
        <textarea
          ref={textareaRef}
          value={candidateInput}
          onChange={(e) => {
            setCandidateInput(e.target.value);
            autoResizeTextarea();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              sendResponse();
            }
          }}
          placeholder="Type your response... (Cmd+Enter to send)"
          rows={3}
          disabled={streaming}
          className="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow disabled:opacity-50"
          style={{ minHeight: "4.5rem" }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {streaming ? "Interviewer is responding..." : "Cmd+Enter to send"}
          </span>
          <button
            onClick={sendResponse}
            disabled={!candidateInput.trim() || streaming}
            className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-4 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {streaming ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Responding...
              </>
            ) : (
              <>
                <Send size={14} />
                Send Response
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
