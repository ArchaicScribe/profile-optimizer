"use client";

interface ScoreBadgeProps {
  score: number;
  /** Show score out of 100, e.g. "75/100" */
  outOf?: boolean;
}

export function ScoreBadge({ score, outOf = false }: ScoreBadgeProps) {
  const color =
    score >= 75
      ? "text-green-500 bg-green-500/10 border-green-500/20"
      : score >= 50
      ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
      : "text-destructive bg-destructive/10 border-destructive/20";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${color}`}
    >
      {outOf ? `${score}/100` : score}
    </span>
  );
}
