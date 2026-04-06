// ---- Resume / Audit --------------------------------------------------------

export interface JDComparison {
  fitScore: number;
  verdict: string;
  matched: string[];
  gaps: string[];
  tailoringTips: string[];
}

export interface ResumeResult {
  score: number;
  headline: string;
  strengths: Array<{ point: string; detail: string }>;
  weaknesses: Array<{ point: string; detail: string; severity: "high" | "medium" | "low" }>;
  rewrites: Array<{ original: string; rewritten: string; reason: string }>;
  missing: Array<{ item: string; detail: string }>;
  redFlags: Array<{ flag: string; detail: string }>;
  nextSteps: string[];
  jdComparison?: JDComparison;
}

export interface AuditResult {
  auditScore: number;
  signals: Array<{ text: string; type: string; severity: string }>;
  recommendations: Array<{ title: string; body: string; priority: string; category: string }>;
  summary: string;
  phrasesToAvoid?: Array<{ phrase: string; reason: string; context: string }>;
}

// ---- JD Analysis -----------------------------------------------------------

export interface JDAnalysis {
  overallFit: "strong" | "moderate" | "poor";
  fitScore: number;
  roleVerdict?: string;
  summary: string;
  matches: Array<{ label: string; detail: string }>;
  concerns: Array<{ label: string; detail: string }>;
  redFlags: Array<{ label: string; detail: string }>;
  isContract: boolean;
  isStaffingAgency: boolean;
  hasGovernmentWork?: boolean;
  locationMatch: boolean;
  recommendation: "apply" | "inquire" | "decline";
  recommendationReason?: string;
  missingFromProfile?: string[];
  suggestedQuestions?: string[];
}

// ---- Profile Rewrite -------------------------------------------------------

export interface HeadlineVariant {
  text: string;
  rationale: string;
  signals: string[];
}

export interface SummaryVariant {
  text: string;
  rationale: string;
  keyChanges: string[];
}

export interface RewriteResult {
  headlines: HeadlineVariant[];
  summaries: SummaryVariant[];
}

// ---- Mock Interview --------------------------------------------------------

export type RoleType = "behavioral" | "system_design" | "cloud_architecture" | "mixed";
export type MessageRole = "interviewer" | "candidate" | "feedback";
export type AppState = "setup" | "interview" | "complete";

export interface InterviewConfig {
  company: string;
  roleType: RoleType;
  questionCount: 5 | 8;
}

export interface MockMessage {
  role: MessageRole;
  content: string;
  score?: number;
}

// ---- Study Guide -----------------------------------------------------------

export interface AiFeedback {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  improvement: string;
}

export interface Attempt {
  id: string;
  createdAt: string;
  answerText: string;
  aiFeedback: AiFeedback | null;
  score: number | null;
  status: "got_it" | "struggled";
}

export interface StudyQuestion {
  id: string;
  category: string;
  difficulty: string;
  topic: string;
  prompt: string;
  hints: string[];
  status: "unanswered" | "got_it" | "struggled";
  reviewCount: number;
}

export interface StudyGuide {
  id: string;
  jobTitle: string;
  company: string;
  jdSummary?: string;
  questions: StudyQuestion[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
