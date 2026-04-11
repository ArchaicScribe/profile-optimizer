import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";

// Explicitly parse .env files at config-evaluation time.
// Workaround for Next.js 16 + Turbopack not reliably surfacing .env.local
// values into process.env before route handlers construct ClaudeClient.
function loadEnvFiles() {
  for (const filename of [".env.local", ".env"]) {
    try {
      const content = readFileSync(join(process.cwd(), filename), "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (match) {
          const key = match[1];
          const val = match[2].replace(/^["']|["']$/g, "").trim();
          // Don't overwrite vars already in the environment (e.g. from CI or start-dev.bat)
          if (!process.env[key]) process.env[key] = val;
        }
      }
    } catch {
      // File not present — skip silently
    }
  }
}

loadEnvFiles();

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "better-sqlite3"],
};

export default nextConfig;
