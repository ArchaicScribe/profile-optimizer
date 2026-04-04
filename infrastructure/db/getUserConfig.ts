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
  targetRole: "Solutions Engineer / Solutions Architect / Customer Engineer",
  targetCompanies: ["Amazon", "Microsoft", "Google", "Snowflake", "Databricks", "Salesforce"],
  currentRole: "Senior Software Engineer",
  yearsExperience: 6,
  keyBackground:
    "Enterprise Java/Spring Boot modernization specialist with 6 years at large organizations. " +
    "Strong in distributed systems, cloud-native architecture (AWS/Azure/Kubernetes), " +
    "OAuth2/security, and production observability. Targeting SE/SA/CA roles at Seattle-area and top-tier tech companies.",
  avoidContext: "Do not emphasize government, federal, or clearance experience. Avoid contractor/staffing agency framing.",
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
- Target roles: ${config.targetRole}
  (These titles are equivalent targets: Solutions Engineer, Solutions Architect, Customer Engineer, Customer Architect, Partner Architect, Technical Account Manager - senior/principal variants included)
- Target companies: ${config.targetCompanies.join(", ")}
  (Prioritize Seattle-area companies and remote-friendly roles at these organizations)
- Background context: ${config.keyBackground}
- De-emphasize: ${config.avoidContext}
`.trim();
}
