import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logLevels: ("query" | "error" | "warn")[] = ["error", "warn"];
if (process.env.PRISMA_LOG_QUERIES === "true") {
  logLevels.push("query");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
