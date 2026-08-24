import { prisma } from "../../db/client.js";

async function main() {
  console.log("=== INSPECTING CREATIVE NODE PROGRESS IN DATABASE ===");

  const allProgress = await prisma.creativeNodeProgress.findMany({
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Total CreativeNodeProgress records: ${allProgress.length}`);
  console.table(
    allProgress.map((p) => ({
      id: p.id,
      userId: p.userId,
      episodeId: p.episodeId,
      nodeId: p.nodeId,
      status: p.status,
      xpEarned: p.xpEarned,
      coinsEarned: p.coinsEarned,
      updatedAt: p.updatedAt.toISOString(),
    }))
  );

  const episodes = await prisma.creativeEpisode.findMany({
    orderBy: { order: "asc" },
  });

  console.log("\n=== EPISODES AND NODES IN SEED DATABASE ===");
  for (const ep of episodes) {
    const nodes = (ep.nodes as any[]) ?? [];
    console.log(`\nEpisode: ${ep.title} (${ep.id}) - Total Nodes: ${nodes.length}`);
    nodes.forEach((n, i) => {
      console.log(`  [${i + 1}] ${n.nodeId} (${n.type}) - "${n.title}"`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
