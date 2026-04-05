import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  // Use forward slashes for libsql URL (required on Windows too)
  const absolutePath = path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
  const adapter = new PrismaLibSql({ url: `file:///${absolutePath}` });
  return new PrismaClient({ adapter } as never);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
