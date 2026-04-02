import type { ProfileAudit } from "../entities/ProfileAudit";

export interface ParsedLinkedInData {
  headline?: string;
  summary?: string;
  positions: Array<{
    title: string;
    company: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills: string[];
  location?: string;
  openToWork?: boolean;
}

export interface IAuditAgent {
  auditFromExport(
    data: ParsedLinkedInData,
    siteContent?: string
  ): Promise<AsyncIterable<string>>;

  auditFromUrl(url: string): Promise<AsyncIterable<string>>;
}
