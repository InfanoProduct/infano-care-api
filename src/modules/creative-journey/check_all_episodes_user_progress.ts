import { prisma } from "../../db/client.js";

async function main() {
  const userId = "be5e53fd-6781-469b-b7a6-8ad3fff00f2a";

  const allProgress = await prisma.creativeNodeProgress.findMany({
    where: { userId },
  });

  const episodes = await prisma.creativeEpisode.findMany({
    orderBy: { order: "asc" },
  });

  console.log(`=== PROGRESS FOR USER ${userId} ===`);

  for (const ep of episodes) {
    const nodes = (ep.nodes as any[]) ?? [];
    const nodeIds = nodes.map((n) => n.nodeId);
    const epProg = allProgress.filter((p) => p.episodeId === ep.id);
    const completedNodes = epProg.filter((p) => p.status === "COMPLETED");

    console.log(`\nEpisode: ${ep.title} (${ep.id})`);
    console.log(`  Total Nodes in Seed: ${nodes.length}`);
    console.log(`  Progress Records in DB: ${epProg.length}`);
    console.log(`  Completed Nodes in DB: ${completedNodes.length} / ${nodes.length}`);

    nodes.forEach((n, i) => {
      const p = epProg.find((x) => x.nodeId === n.nodeId);
      console.log(`    [${i + 1}] ${n.nodeId} (${n.type}) -> Status: ${p?.status ?? "NONE"}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
