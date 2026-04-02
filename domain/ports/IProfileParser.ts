import type { ParsedLinkedInData } from "./IAuditAgent";

export interface IProfileParser {
  parseLinkedInExport(zipBuffer: Buffer): Promise<ParsedLinkedInData>;
}
