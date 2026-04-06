import { prisma } from "./PrismaClient";

export interface UserConfig {
  targetRole: string;
  targetCompanies: string[];
  currentRole: string;
  yearsExperience: number;
  keyBackground: string;
  avoidContext: string;
  activeCert: string;
  certPath: string[];
}

export const DEFAULTS: UserConfig = {
  targetRole: "Solutions Engineer / Solutions Architect / Customer Engineer",
  targetCompanies: ["Amazon", "Microsoft", "Google", "Snowflake", "Databricks", "Salesforce"],
  currentRole: "Senior Software Engineer",
  yearsExperience: 6,
  keyBackground:
    "Enterprise Java/Spring Boot modernization specialist with 6 years at large organizations. " +
    "Strong in distributed systems, cloud-native architecture (AWS/Azure/Kubernetes), " +
    "OAuth2/security, and production observability. Targeting SE/SA/CA roles at Seattle-area and top-tier tech companies.",
  avoidContext: "Do not emphasize government, federal, or clearance experience. Avoid contractor/staffing agency framing.",
  activeCert: "AI-102",
  certPath: ["AI-102", "AZ-305"],
};

const CERT_CONTEXT: Record<string, string> = {
  "AI-102": "Currently studying AI-102 (Azure AI Engineer Associate). Covers: Azure OpenAI Service, Azure AI Search, Azure AI Vision/Speech/Language, Document Intelligence, Azure AI Foundry, responsible AI principles, and deploying AI solutions on Azure. Include Azure AI service questions in study guides where relevant.",
  "AZ-305": "Currently studying AZ-305 (Azure Solutions Architect Expert). Covers: designing Azure compute, storage, networking, data, identity, and security solutions at enterprise scale. Include Azure architecture design questions in study guides.",
  "AZ-104": "Currently studying AZ-104 (Azure Administrator Associate). Covers: Azure identity, governance, storage, compute, networking, and monitoring.",
  "DP-203": "Currently studying DP-203 (Azure Data Engineer Associate). Covers: data storage, data processing, and data security on Azure. Include Azure data pipeline questions.",
  "SnowPro Core": "Currently studying SnowPro Core certification. Include Snowflake architecture, virtual warehouses, data sharing, and query optimization questions.",
};

export async function getUserConfig(): Promise<UserConfig> {
  try {
    const config = await prisma.userConfig.findUnique({ where: { id: "singleton" } });
    if (!config) return DEFAULTS;
    return {
      targetRole: config.targetRole,
      targetCompanies: JSON.parse(config.targetCompanies),
      currentRole: config.currentRole,
      yearsExperience: config.yearsExperience,
      keyBackground: config.keyBackground,
      avoidContext: config.avoidContext,
      activeCert: config.activeCert,
      certPath: JSON.parse(config.certPath || "[]"),
    };
  } catch {
    return DEFAULTS;
  }
}

export function buildGoalsContext(config: UserConfig): string {
  const certLine = config.activeCert
    ? CERT_CONTEXT[config.activeCert] ?? `Currently studying ${config.activeCert}.`
    : "";
  const certPathLine = config.certPath.length > 1
    ? `Certification path: ${config.certPath.join(" -> ")}`
    : "";

  return `
## Candidate Goals
- Current role: ${config.currentRole} (${config.yearsExperience} years experience)
- Target roles: ${config.targetRole}
  (These titles are equivalent targets: Solutions Engineer, Solutions Architect, Customer Engineer, Customer Architect, Partner Architect, Technical Account Manager - senior/principal variants included)
- Target companies: ${config.targetCompanies.join(", ")}
  (Prioritize Seattle-area companies and remote-friendly roles at these organizations)
- Background context: ${config.keyBackground}
- De-emphasize: ${config.avoidContext}
${certLine ? `- Certifications in progress: ${certLine}` : ""}
${certPathLine ? `- ${certPathLine}` : ""}
`.trim();
}

/** Convenience: load config and build the goals context string in one call. */
export async function getGoalsContext(): Promise<{ config: UserConfig; goalsContext: string }> {
  const config = await getUserConfig();
  return { config, goalsContext: buildGoalsContext(config) };
}
