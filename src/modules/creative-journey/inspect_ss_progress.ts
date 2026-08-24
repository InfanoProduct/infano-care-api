import { prisma } from "../../db/client.js";

async function main() {
  const userId = "be5e53fd-6781-469b-b7a6-8ad3fff00f2a";
  const episodeId = "ce_skin_stories";

  const allProg = await prisma.creativeNodeProgress.findMany({
    where: { userId, episodeId },
    orderBy: { updatedAt: "asc" },
  });

  console.log(`=== CREATIVE NODE PROGRESS FOR EPISODE ${episodeId} ===`);
  console.table(
    allProg.map((p) => ({
      id: p.id,
      nodeId: p.nodeId,
      status: p.status,
      xpEarned: p.xpEarned,
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
