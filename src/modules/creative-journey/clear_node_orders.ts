import { prisma } from "../../db/client.js";

async function main() {
  console.log("Cleaning stale nodeOrder records...");
  const updated = await prisma.creativeNodeProgress.updateMany({
    data: { nodeOrder: null }
  });
  console.log("Cleared nodeOrder on", updated.count, "records.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
