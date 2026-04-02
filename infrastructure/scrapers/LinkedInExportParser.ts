import AdmZip from "adm-zip";
import { parse } from "path";
import type { IProfileParser } from "../../domain/ports/IProfileParser";
import type { ParsedLinkedInData } from "../../domain/ports/IAuditAgent";

// LinkedIn data export is a ZIP containing CSVs.
// The file names vary slightly across exports, so we match by prefix.
const FILE_KEYS = {
  profile: ["Profile.csv", "profile.csv"],
  positions: ["Positions.csv", "positions.csv", "Experience.csv"],
  skills: ["Skills.csv", "skills.csv"],
};

export class LinkedInExportParser implements IProfileParser {
  async parseLinkedInExport(zipBuffer: Buffer): Promise<ParsedLinkedInData> {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    const findEntry = (candidates: string[]) =>
      entries.find((e) =>
        candidates.some((name) => e.entryName.endsWith(name))
      );

    const readCsv = (entry: AdmZip.IZipEntry | undefined): string[][] => {
      if (!entry) return [];
      const text = entry.getData().toString("utf-8");
      return text
        .split("\n")
        .filter(Boolean)
        .map((line) => this.parseCsvLine(line));
    };

    const profileEntry = findEntry(FILE_KEYS.profile);
    const positionsEntry = findEntry(FILE_KEYS.positions);
    const skillsEntry = findEntry(FILE_KEYS.skills);

    const profileRows = readCsv(profileEntry);
    const positionRows = readCsv(positionsEntry);
    const skillRows = readCsv(skillsEntry);

    // Profile CSV: first row is headers, second row is data
    const profileHeaders = profileRows[0] ?? [];
    const profileData = profileRows[1] ?? [];
    const profileMap = Object.fromEntries(
      profileHeaders.map((h, i) => [h.trim(), profileData[i]?.trim() ?? ""])
    );

    // Positions CSV: first row headers, remaining rows are positions
    const posHeaders = positionRows[0] ?? [];
    const positions = positionRows.slice(1).map((row) => {
      const pos = Object.fromEntries(
        posHeaders.map((h, i) => [h.trim(), row[i]?.trim() ?? ""])
      );
      return {
        title: pos["Title"] ?? pos["title"] ?? "",
        company: pos["Company Name"] ?? pos["company"] ?? "",
        description: pos["Description"] ?? pos["description"] ?? "",
        startDate: pos["Started On"] ?? pos["startDate"] ?? "",
        endDate: pos["Finished On"] ?? pos["endDate"] ?? "",
      };
    });

    // Skills CSV: "Name" column
    const skillHeaders = skillRows[0] ?? [];
    const nameIdx = skillHeaders.findIndex((h) =>
      h.trim().toLowerCase() === "name"
    );
    const skills = skillRows
      .slice(1)
      .map((row) => row[nameIdx]?.trim() ?? "")
      .filter(Boolean);

    return {
      headline: profileMap["Headline"] ?? profileMap["headline"],
      summary: profileMap["Summary"] ?? profileMap["summary"],
      location: profileMap["Geo Location"] ?? profileMap["location"],
      positions: positions.filter((p) => p.title || p.company),
      skills,
      openToWork: false, // Not available in export; user can indicate manually
    };
  }

  // Basic CSV line parser — handles quoted fields with commas inside
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
