import type { JobMatch, ScanPreferences } from "../entities/JobMatch";

export interface IJobScanner {
  scan(prefs: ScanPreferences): Promise<JobMatch[]>;
}
