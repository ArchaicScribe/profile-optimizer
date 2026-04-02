export type SignalType =
  | "contract_attractor"
  | "location_attractor"
  | "positive"
  | "neutral";

export type Severity = "high" | "medium" | "low";
export type Priority = "high" | "medium" | "low";
export type RecommendationCategory =
  | "keywords"
  | "location"
  | "tone"
  | "experience"
  | "skills";

export interface RecruiterSignal {
  text: string;
  type: SignalType;
  severity: Severity;
}

export interface Recommendation {
  title: string;
  body: string;
  priority: Priority;
  category: RecommendationCategory;
}

export interface ProfileAudit {
  id: string;
  createdAt: Date;
  source: "export" | "live" | "url";
  auditScore: number; // 0–100
  signals: RecruiterSignal[];
  recommendations: Recommendation[];
}
