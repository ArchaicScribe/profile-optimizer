import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import path from "path";

// Global singleton for Prisma to avoid exhausting DB connections in dev
// (Next.js hot reload creates new module instances repeatedly)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? "./prisma/dev.db";
  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(process.cwd(), dbPath.replace(/^\.\//, ""));

  const libsql = createClient({ url: `file:${absolutePath}` });
  const adapter = new PrismaLibSql(libsql);
  return new PrismaClient({ adapter } as never);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
