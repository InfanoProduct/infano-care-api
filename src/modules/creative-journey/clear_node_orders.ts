import { prisma } from "../../db/client.js";
import { Prisma } from "@prisma/client";

async function main() {
  console.log("Cleaning stale nodeOrder records...");
  const updated = await prisma.creativeNodeProgress.updateMany({
    data: { nodeOrder: Prisma.DbNull }
  });
  console.log("Cleared nodeOrder on", updated.count, "records.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
