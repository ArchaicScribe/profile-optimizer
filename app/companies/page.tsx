"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, RefreshCw, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface LoopRound {
  round: string;
  format: string;
  focus: string;
  duration: string;
}

interface CompanyData {
  company: string;
  roles: string[];
  loopStructure: LoopRound[];
  keySignals: string[];
  knownPatterns: string[];
  techStack: string[];
  whatGoodLooksLike: string;
  redFlags: string[];
  insiderTips: string[];
  cloudFocus: string;
}

interface CompanyCard {
  id: string;
  company: string;
  createdAt: string;
  rawData: CompanyData;
}

const CLOUD_COLOR: Record<string, string> = {
  AWS: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  Azure: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  GCP: "border-red-500/40 bg-red-500/10 text-red-500",
  "Multi-cloud": "border-[oklch(0.6_0.2_280/40%)] bg-[oklch(0.6_0.2_280/10%)] text-[oklch(0.55_0.2_280)]",
  Agnostic: "border-border/60 bg-muted/30 text-muted-foreground",
};

function CloudBadge({ focus }: { focus: string }) {
  const cls = CLOUD_COLOR[focus] ?? CLOUD_COLOR["Agnostic"];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {focus}
    </span>
  );
}

function BulletList({ items, variant }: { items: string[]; variant?: "red" | "green" | "default" }) {
  const dotColor =
    variant === "red" ? "bg-destructive" : variant === "green" ? "bg-green-500" : "bg-[oklch(0.6_0.2_280)]";
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
          <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CompanyCardPanel({
  company,
  card,
  onGenerate,
  generating,
}: {
  company: string;
  card: CompanyCard | null;
  onGenerate: (company: string) => void;
  generating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const d = card?.rawData;

  return (
    <Card className="border-border/60 bg-card/60">
      <button
        onClick={() => card && setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <Building2 size={16} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{company}</span>
          {d && <CloudBadge focus={d.cloudFocus} />}
          {card && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(card.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {card ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate(company); }}
                disabled={generating}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                Regenerate
              </button>
              {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onGenerate(company); }}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-3 py-1.5 text-xs font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
            >
              {generating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Generate
            </button>
          )}
        </div>
      </button>

      {open && d && (
        <div className="px-5 pb-5 space-y-5">
          <Separator className="opacity-50" />

          {/* Roles */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Titles at {company}</p>
            <div className="flex flex-wrap gap-2">
              {d.roles.map((r, i) => (
                <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
              ))}
            </div>
          </div>

          {/* Loop Structure */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interview Loop</p>
            <div className="space-y-2">
              {d.loopStructure.map((round, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-2.5 text-sm">
                  <span className="font-medium">{round.round}</span>
                  <span className="text-muted-foreground">{round.format}</span>
                  <span className="text-muted-foreground">{round.focus}</span>
                  <span className="text-muted-foreground shrink-0">{round.duration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tech Stack Focus</p>
            <div className="flex flex-wrap gap-1.5">
              {d.techStack.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">{t}</Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Key Signals */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What They Look For</p>
              <BulletList items={d.keySignals} />
            </div>

            {/* Known Patterns */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Known Question Patterns</p>
              <BulletList items={d.knownPatterns} />
            </div>
          </div>

          {/* What Good Looks Like */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What Good Looks Like</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{d.whatGoodLooksLike}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Red Flags */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive/70">Red Flags</p>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <BulletList items={d.redFlags} variant="red" />
              </div>
            </div>

            {/* Insider Tips */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600/70 dark:text-green-400/70">Insider Tips</p>
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <BulletList items={d.insiderTips} variant="green" />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function CompaniesPage() {
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [cards, setCards] = useState<Record<string, CompanyCard>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [goalsRes, cardsRes] = await Promise.all([
          fetch("/api/goals"),
          fetch("/api/companies"),
        ]);
        const goals = await goalsRes.json();
        const cardsData = await cardsRes.json();

        const targets: string[] = goals.targetCompanies ?? [];
        setTargetCompanies(targets);

        const cardMap: Record<string, CompanyCard> = {};
        for (const c of cardsData.cards ?? []) {
          cardMap[c.company] = c;
        }
        setCards(cardMap);

        // All companies = target list + any already-generated ones not in target list
        const extra = (cardsData.cards ?? [])
          .map((c: CompanyCard) => c.company)
          .filter((c: string) => !targets.includes(c));
        setAllCompanies([...targets, ...extra]);
      } catch {
        setError("Failed to load company data.");
      }
    }
    load();
  }, []);

  const generate = async (company: string) => {
    setGenerating((prev) => ({ ...prev, [company]: true }));
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCards((prev) => ({ ...prev, [company]: { id: data.id, company: data.company, createdAt: data.createdAt, rawData: data.rawData } }));
      if (!allCompanies.includes(company)) {
        setAllCompanies((prev) => [...prev, company]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating((prev) => ({ ...prev, [company]: false }));
    }
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    setCustomInput("");
    generate(name);
  };

  const generatedCount = Object.keys(cards).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Company Research</h1>
        <p className="mt-1.5 text-muted-foreground">
          AI-generated SE/SA/CA interview intelligence for each target company - loop structure, what they weight, known patterns, and insider tips.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{allCompanies.length} companies</span>
        <span className="text-border">|</span>
        <span className={generatedCount > 0 ? "text-green-500" : ""}>{generatedCount} cards generated</span>
        <span className="text-border">|</span>
        <span>{allCompanies.length - generatedCount} remaining</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add custom company */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a Company</CardTitle>
          <CardDescription>Generate a research card for any company not in your target list.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Palantir, Confluent, Datadog..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
            <button
              onClick={addCustom}
              disabled={!customInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-4 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
            >
              <Plus size={14} />
              Generate
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Company cards */}
      <div className="space-y-3">
        {allCompanies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading companies from your settings...</p>
        ) : (
          allCompanies.map((company) => (
            <CompanyCardPanel
              key={company}
              company={company}
              card={cards[company] ?? null}
              onGenerate={generate}
              generating={generating[company] ?? false}
            />
          ))
        )}
      </div>
    </div>
  );
}
