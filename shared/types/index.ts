export type { ProfileAudit, RecruiterSignal, Recommendation, SignalType, Severity, Priority, RecommendationCategory } from "../../domain/entities/ProfileAudit";
export type { JobMatch, ScanPreferences, JobBoard } from "../../domain/entities/JobMatch";
export type { ParsedLinkedInData } from "../../domain/ports/IAuditAgent";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface AuditRequest {
  source: "url";
  url: string;
}

export interface JobScanRequest {
  preferences: import("../../domain/entities/JobMatch").ScanPreferences;
}
