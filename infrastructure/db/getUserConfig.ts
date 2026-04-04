import { prisma } from "./PrismaClient";

export interface UserConfig {
  targetRole: string;
  targetCompanies: string[];
  currentRole: string;
  yearsExperience: number;
  keyBackground: string;
  avoidContext: string;
}

const DEFAULTS: UserConfig = {
  targetRole: "Solutions Engineer",
  targetCompanies: ["Snowflake", "Databricks", "Google", "Meta", "Stripe", "Cloudflare"],
  currentRole: "Senior Software Engineer",
  yearsExperience: 6,
  keyBackground:
    "Enterprise Java/Spring Boot modernization specialist with 6 years at large organizations. " +
    "Strong in distributed systems, cloud-native architecture (AWS/Azure/Kubernetes), " +
    "OAuth2/security, and production observability. Targeting SE/SA roles at top-tier tech companies.",
  avoidContext: "Do not emphasize government, federal, or clearance experience.",
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
    };
  } catch {
    return DEFAULTS;
  }
}

export function buildGoalsContext(config: UserConfig): string {
  return `
## Candidate Goals
- Current role: ${config.currentRole} (${config.yearsExperience} years experience)
- Target role: ${config.targetRole}
- Target companies: ${config.targetCompanies.join(", ")}
- Background context: ${config.keyBackground}
- De-emphasize: ${config.avoidContext}
`.trim();
}
