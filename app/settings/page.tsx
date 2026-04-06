"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, Plus, X, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SUGGESTED_COMPANIES = [
  // Seattle core
  "Amazon", "Microsoft", "Google", "Meta", "Apple",
  "Tableau", "Salesforce", "Expedia", "T-Mobile", "Zillow", "F5 Networks",
  // Data / Cloud platform
  "Snowflake", "Databricks", "Confluent", "dbt Labs", "MongoDB",
  // Infrastructure / DevOps
  "HashiCorp", "Datadog", "Cloudflare", "Elastic", "Dynatrace",
  // Fintech / SaaS
  "Stripe", "Palantir", "Figma", "Notion", "Linear",
];

interface Config {
  targetRole: string;
  targetCompanies: string[];
  currentRole: string;
  yearsExperience: number;
  keyBackground: string;
  avoidContext: string;
  activeCert: string;
  certPath: string[];
  certNotes: string;
}

const CERT_SUGGESTIONS = [
  "AI-102", "AZ-305", "AZ-104", "AZ-900",
  "DP-203", "DP-900", "SnowPro Core", "Databricks Associate",
  "AWS SAA-C03", "AWS SAP-C02", "GCP ACE", "GCP PCA",
];

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setError("Failed to load settings."));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConfig({ ...data, targetCompanies: data.targetCompanies });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleCompany = (company: string) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const has = prev.targetCompanies.includes(company);
      return {
        ...prev,
        targetCompanies: has
          ? prev.targetCompanies.filter((c) => c !== company)
          : [...prev.targetCompanies, company],
      };
    });
  };

  if (!config) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Career Goals</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything here is injected into your profile audit, resume analysis, and study guide generation.
          Keep it accurate and it personalizes the entire system.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Role targeting */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Role Target</CardTitle>
          <CardDescription className="text-sm">Where you are and where you are going.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Current role</label>
              <input
                type="text"
                value={config.currentRole}
                onChange={(e) => setConfig((p) => p && { ...p, currentRole: e.target.value })}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target role</label>
              <input
                type="text"
                value={config.targetRole}
                onChange={(e) => setConfig((p) => p && { ...p, targetRole: e.target.value })}
                placeholder="Solutions Engineer"
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Years of experience</label>
            <input
              type="number"
              min={1}
              max={30}
              value={config.yearsExperience}
              onChange={(e) => setConfig((p) => p && { ...p, yearsExperience: parseInt(e.target.value) || 1 })}
              className="w-32 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
          </div>
        </CardContent>
      </Card>

      {/* Target companies */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Target Companies</CardTitle>
          <CardDescription className="text-sm">
            Select companies you are actively targeting. Used to tailor audit signals, resume feedback, and study guide questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_COMPANIES.map((company) => {
              const active = config.targetCompanies.includes(company);
              return (
                <button
                  key={company}
                  onClick={() => toggleCompany(company)}
                  className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-all duration-150 ${
                    active
                      ? "bg-[oklch(0.6_0.2_280)] border-transparent text-white shadow-sm"
                      : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                  }`}
                >
                  {company}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Others <span className="text-muted-foreground font-normal">(comma separated)</span>
            </label>
            <input
              type="text"
              placeholder="Anthropic, OpenAI, Vercel..."
              value={config.targetCompanies.filter((c) => !SUGGESTED_COMPANIES.includes(c)).join(", ")}
              onChange={(e) => {
                const custom = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                const suggested = config.targetCompanies.filter((c) => SUGGESTED_COMPANIES.includes(c));
                setConfig((p) => p && { ...p, targetCompanies: [...suggested, ...custom] });
              }}
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] transition-shadow"
            />
          </div>
        </CardContent>
      </Card>

      <Separator className="opacity-50" />

      {/* Certification path */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Certification Path</CardTitle>
          <CardDescription className="text-sm">
            Your active cert is injected into study guides and company research so AI questions match what you are preparing for.
            Private notes stay local and are never sent to AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Visual path */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cert path (ordered)</label>
            <div className="flex flex-wrap items-center gap-2">
              {(config.certPath.length > 0 ? config.certPath : [""]).map((cert, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    cert === config.activeCert
                      ? "bg-[oklch(0.6_0.2_280)] border-transparent text-white"
                      : "border-border/60 text-muted-foreground"
                  }`}>
                    {cert === config.activeCert && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
                    )}
                    <span>{cert || "..."}</span>
                    <button
                      onClick={() => setConfig((p) => p && {
                        ...p,
                        certPath: p.certPath.filter((_, idx) => idx !== i),
                        activeCert: p.activeCert === cert ? (p.certPath[i + 1] ?? p.certPath[i - 1] ?? "") : p.activeCert,
                      })}
                      className="ml-0.5 opacity-60 hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  {i < config.certPath.length - 1 && (
                    <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add cert */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add cert to path</label>
            <div className="flex flex-wrap gap-1.5">
              {CERT_SUGGESTIONS.filter((c) => !config.certPath.includes(c)).map((cert) => (
                <button
                  key={cert}
                  onClick={() => setConfig((p) => p && { ...p, certPath: [...p.certPath, cert] })}
                  className="rounded-full border border-dashed border-border/60 px-3 py-0.5 text-xs text-muted-foreground hover:border-foreground/50 hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Plus size={9} />
                  {cert}
                </button>
              ))}
            </div>
          </div>

          {/* Active cert selector */}
          {config.certPath.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Currently active (studying now)</label>
              <div className="flex flex-wrap gap-2">
                {config.certPath.map((cert) => (
                  <button
                    key={cert}
                    onClick={() => setConfig((p) => p && { ...p, activeCert: cert })}
                    className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-all ${
                      config.activeCert === cert
                        ? "bg-[oklch(0.6_0.2_280)] border-transparent text-white"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {cert}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Private notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Private notes{" "}
              <span className="text-muted-foreground font-normal text-xs">(not sent to AI)</span>
            </label>
            <textarea
              rows={2}
              value={config.certNotes}
              onChange={(e) => setConfig((p) => p && { ...p, certNotes: e.target.value })}
              placeholder="e.g. exam booked for June 15, using John Savill's course..."
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow"
            />
          </div>
        </CardContent>
      </Card>

      <Separator className="opacity-50" />

      {/* AI context */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">AI Context</CardTitle>
          <CardDescription className="text-sm">
            Plain-language background injected into every AI prompt. Be specific about your strengths and what you want to move toward.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Background and strengths</label>
            <textarea
              rows={4}
              value={config.keyBackground}
              onChange={(e) => setConfig((p) => p && { ...p, keyBackground: e.target.value })}
              placeholder="e.g. Enterprise Java/Spring Boot modernization, 6 years, strong in distributed systems and cloud-native architecture..."
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What to de-emphasize</label>
            <textarea
              rows={2}
              value={config.avoidContext}
              onChange={(e) => setConfig((p) => p && { ...p, avoidContext: e.target.value })}
              placeholder="e.g. Do not emphasize government or federal experience. Avoid contractor framing."
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_280/40%)] resize-y transition-shadow"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.2_280)] text-white px-5 py-2 text-sm font-medium hover:bg-[oklch(0.55_0.2_280)] disabled:opacity-50 transition-colors"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Save size={14} />Save goals</>}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-500">
            <CheckCircle2 size={14} /> Saved - all AI prompts updated
          </span>
        )}
      </div>
    </div>
  );
}
