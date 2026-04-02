export type JobBoard = "indeed" | "linkedin" | "levels" | "dice";

export interface JobMatch {
  id: string;
  scannedAt: Date;
  title: string;
  company: string;
  location: string;
  url: string;
  board: JobBoard;
  matchScore: number; // 0–100
  fitReason?: string;
  isContract: boolean;
}

export interface ScanPreferences {
  locations: string[];        // e.g. ["Seattle", "Boston", "Remote"]
  excludeLocations: string[]; // e.g. ["Albuquerque", "New Mexico"]
  roleKeywords: string[];     // e.g. ["Senior Software Engineer", "Staff Engineer"]
  excludeKeywords: string[];  // e.g. ["contract", "C2C", "1099"]
  directHireOnly: boolean;
  boards: JobBoard[];
}
