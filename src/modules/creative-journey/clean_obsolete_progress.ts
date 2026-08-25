import { prisma } from "../../db/client.js";

async function main() {
  console.log("Cleaning up obsolete node progress records across all episodes...");

  const episodes = await prisma.creativeEpisode.findMany();
  let totalDeleted = 0;

  for (const ep of episodes) {
    const nodes = (ep.nodes as any[]) ?? [];
    const validNodeIds = new Set(nodes.map((n) => n.nodeId));

    const progressList = await prisma.creativeNodeProgress.findMany({
      where: { episodeId: ep.id },
    });

    const obsoleteIds = progressList
      .filter((p) => !validNodeIds.has(p.nodeId))
      .map((p) => p.id);

    if (obsoleteIds.length > 0) {
      const res = await prisma.creativeNodeProgress.deleteMany({
        where: { id: { in: obsoleteIds } },
      });
      totalDeleted += res.count;
      console.log(`Deleted ${res.count} obsolete progress records for episode ${ep.title} (${ep.id})`);
    }
  }

  console.log(`Total obsolete records cleaned: ${totalDeleted}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
