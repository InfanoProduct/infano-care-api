import { prisma } from "../../db/client.js";

async function main() {
  const userId = "be5e53fd-6781-469b-b7a6-8ad3fff00f2a";
  const episodeId = "ce_skin_stories";

  console.log("Fixing stale unlocked progress rows for Episode 3 in PostgreSQL...");

  // Update ss_glow_quiz to LOCKED
  await prisma.creativeNodeProgress.updateMany({
    where: {
      userId,
      episodeId,
      nodeId: "ss_glow_quiz",
      status: "UNLOCKED",
    },
    data: {
      status: "LOCKED",
    },
  });

  const remaining = await prisma.creativeNodeProgress.findMany({
    where: { userId, episodeId },
    orderBy: { updatedAt: "asc" },
  });

  console.log("\nUpdated DB Progress for Episode 3:");
  console.table(
    remaining.map((p) => ({
      nodeId: p.nodeId,
      status: p.status,
      xpEarned: p.xpEarned,
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
