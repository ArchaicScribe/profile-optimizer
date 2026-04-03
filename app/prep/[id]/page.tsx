"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { use } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Lightbulb, Bot, X, Send, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudyQuestion {
  id: string;
  category: string;
  difficulty: string;
  topic: string;
  prompt: string;
  hints: string[];
  status: "unanswered" | "got_it" | "struggled";
  reviewCount: number;
}

interface StudyGuide {
  id: string;
  jobTitle: string;
  company: string;
  jdSummary?: string;
  questions: StudyQuestion[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CATEGORIES = [
  { key: "dsa", label: "DSA" },
  { key: "system_design", label: "System Design" },
  { key: "sql", label: "SQL" },
  { key: "ai_ml", label: "AI / ML" },
  { key: "company_specific", label: "Company" },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-green-500 border-green-500/30 bg-green-500/5",
  medium: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5",
  hard: "text-destructive border-destructive/30 bg-destructive/5",
};

function QuestionCard({
  q,
  onStatus,
  onAskTutor,
}: {
  q: StudyQuestion;
  onStatus: (id: string, status: StudyQuestion["status"]) => void;
  onAskTutor: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);

  const borderClass =
    q.status === "got_it"
      ? "border-green-500/30"
      : q.status === "struggled"
      ? "border-destructive/40"
      : "border-border/60";

  const bgClass =
    q.status === "got_it"
      ? "bg-green-500/5"
      : q.status === "struggled"
      ? "bg-destructive/5"
      : "bg-card/60";

  return (
    <Card className={`${borderClass} ${bgClass} transition-all duration-200`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 mt-0.5">
            {q.status === "got_it" ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : q.status === "struggled" ? (
              <AlertTriangle size={16} className="text-destructive" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-border" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${DIFFICULTY_COLOR[q.difficulty] ?? ""}`}>
                {q.difficulty}
              </span>
              <span className="text-xs text-muted-foreground">{q.topic}</span>
            </div>
            <p className="text-sm font-medium mt-1 leading-snug">{q.prompt}</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={14} className="shrink-0 mt-1 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 mt-1 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          <Separator className="opacity-40" />

          {/* Hints */}
          {q.hints.length > 0 && (
            <div className="space-y-2">
              {q.hints.slice(0, hintsShown).map((hint, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-[oklch(0.6_0.2_280/20%)] bg-[oklch(0.6_0.2_280/5%)] px-3 py-2">
                  <Lightbulb size={13} className="shrink-0 mt-0.5 text-[oklch(0.65_0.15_280)]" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
                </div>
              ))}
              {hintsShown < q.hints.length && (
                <button
                  onClick={() => setHintsShown((n) => n + 1)}
                  className="text-xs text-[oklch(0.65_0.15_280)] hover:text-[oklch(0.7_0.15_280)] transition-colors flex items-center gap-1"
                >
                  <Lightbulb size={11} />
                  {hintsShown === 0 ? "Show first hint" : `Show hint ${hintsShown + 1} of ${q.hints.length}`}
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onStatus(q.id, "got_it")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                q.status === "got_it"
                  ? "bg-green-600 border-green-600 text-white"
                  : "border-green-500/40 text-green-500 hover:bg-green-500/10"
              }`}
            >
              <CheckCircle2 size={12} /> Got it
            </button>
            <button
              onClick={() => onStatus(q.id, "struggled")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                q.status === "struggled"
                  ? "bg-destructive border-destructive text-white"
                  : "border-destructive/40 text-destructive hover:bg-destructive/10"
              }`}
            >
              <XCircle size={12} /> Struggled
            </button>
            {q.status !== "unanswered" && (
              <button
                onClick={() => onStatus(q.id, "unanswered")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <button
              onClick={() => onAskTutor(`I'm working on this question: "${q.prompt}". Can you help me think through it?`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <Bot size={12} /> Ask tutor
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function TutorChat({
  guideId,
  open,
  onClose,
  initialMessage,
}: {
  guideId: string;
  open: boolean;
  onClose: () => void;
  initialMessage?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(`/api/study/${guideId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          const parsed = JSON.parse(data);
          if (parsed.chunk) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: updated[updated.length - 1].content + parsed.chunk,
              };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, I ran into an error. Please try again." };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [guideId, streaming]);

  useEffect(() => {
    if (initialMessage && open) {
      sendMessage(initialMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] z-50 flex flex-col rounded-t-2xl sm:rounded-2xl border border-border/60 bg-background shadow-2xl shadow-black/30 max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[oklch(0.6_0.2_280/15%)] border border-[oklch(0.6_0.2_280/30%)] flex items-center justify-center">
            <Bot size={14} className="text-[oklch(0.7_0.15_280)]" />
          </div>
          <span className="text-sm font-medium">AI Tutor</span>
          {streaming && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[oklch(0.6_0.2_280)] animate-pulse" />}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !streaming && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Ask me anything about this guide. Hints, explanations, walkthroughs - I'm here.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-[oklch(0.6_0.2_280)] text-white rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}>
              {m.content || (streaming && i === messages.length - 1 ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                  <Loader2 size={10} className="animate-spin" /> Thinking...
                </span>
              ) : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-border/60 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask a question... (Enter to send)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[oklch(0.6_0.2_280)] text-white disabled:opacity-40 hover:bg-[oklch(0.55_0.2_280)] transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PrepGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("dsa");

  useEffect(() => {
    fetch(`/api/study/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGuide(data.guide);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load guide."); setLoading(false); });
  }, [id]);

  const updateStatus = async (qid: string, status: StudyQuestion["status"]) => {
    // Optimistic update
    setGuide((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === qid ? { ...q, status, reviewCount: q.reviewCount + (status !== "unanswered" ? 1 : 0) } : q
        ),
      };
    });

    await fetch(`/api/study/${id}/questions/${qid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const openTutor = (prompt: string) => {
    setTutorPrompt(prompt);
    setChatOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded-full bg-muted animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-lg px-4 py-3">
        {error ?? "Guide not found."}
      </div>
    );
  }

  const questions = guide.questions;
  const total = questions.length;
  const gotIt = questions.filter((q) => q.status === "got_it").length;
  const struggled = questions.filter((q) => q.status === "struggled").length;
  const reviewed = gotIt + struggled;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">{guide.jobTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{guide.company}</p>
      </div>

      {/* Progress summary */}
      <Card className="border-border/60 bg-card/60">
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{reviewed} of {total} questions reviewed</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle2 size={11} /> {gotIt} got it
              </span>
              {struggled > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle size={11} /> {struggled} struggled
                </span>
              )}
            </div>
          </div>
          <Progress value={total > 0 ? (reviewed / total) * 100 : 0} className="h-1.5" />
          {struggled > 0 && (
            <p className="text-xs text-muted-foreground">
              Struggled questions appear at the top of each section so they come back around.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator className="opacity-50" />

      {/* Questions by category */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {CATEGORIES.map((cat) => {
            const catQs = questions.filter((q) => q.category === cat.key);
            const catStruggled = catQs.filter((q) => q.status === "struggled").length;
            return (
              <TabsTrigger key={cat.key} value={cat.key} className="gap-1.5 text-xs">
                {cat.label}
                {catStruggled > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-white text-[10px] font-bold">
                    {catStruggled}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map((cat) => {
          const catQs = questions.filter((q) => q.category === cat.key);
          // Sort: struggled first, then unanswered, then got_it
          const sorted = [
            ...catQs.filter((q) => q.status === "struggled"),
            ...catQs.filter((q) => q.status === "unanswered"),
            ...catQs.filter((q) => q.status === "got_it"),
          ];

          return (
            <TabsContent key={cat.key} value={cat.key} className="space-y-3">
              {sorted.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No questions in this category.</p>
              ) : (
                sorted.map((q) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    onStatus={updateStatus}
                    onAskTutor={openTutor}
                  />
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Floating tutor button */}
      {!chatOpen && (
        <button
          onClick={() => { setTutorPrompt(undefined); setChatOpen(true); }}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[oklch(0.6_0.2_280)] text-white px-4 py-2.5 text-sm font-medium shadow-lg shadow-[oklch(0.6_0.2_280/30%)] hover:bg-[oklch(0.55_0.2_280)] transition-colors"
        >
          <Bot size={16} /> Ask Tutor
        </button>
      )}

      <TutorChat
        guideId={id}
        open={chatOpen}
        onClose={() => { setChatOpen(false); setTutorPrompt(undefined); }}
        initialMessage={tutorPrompt}
      />
    </div>
  );
}
