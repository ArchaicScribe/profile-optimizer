import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "better-sqlite3"],
};

export default nextConfig;
