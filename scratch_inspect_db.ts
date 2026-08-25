import { prisma } from "./src/db/client.js";

async function main() {
  const episodes = await prisma.creativeEpisode.findMany();
  console.log("=== ALL EPISODES IN DB ===");
  for (const ep of episodes) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Episode ID: ${ep.id} | Order: ${ep.order} | Title: ${ep.title} | JourneyId: ${ep.journeyId}`);
    if (Array.isArray(ep.nodes)) {
      console.log(`Nodes Count: ${ep.nodes.length}`);
      for (const n of ep.nodes as any[]) {
        let detail = "";
        if (n.type === 'quiz') detail = `QCount: ${n.content?.questions?.length}`;
        if (n.type === 'drag_to_label') detail = `Targets: ${n.content?.targets?.length || n.content?.labels?.length}`;
        if (n.type === 'drag_to_sort') detail = `Items: ${n.content?.items?.length}`;
        if (n.type === 'match_pairs') detail = `Pairs: ${n.content?.pairs?.length}`;
        if (n.type === 'body_appreciation_jar') detail = `Gems: ${n.content?.gems?.length}, MaxCap: ${n.content?.maxCapacity}`;
        if (n.type === 'scenario_choice') detail = `Scenarios: ${n.content?.scenarios?.length}`;
        if (n.type === 'myth_busters') detail = `Cards: ${n.content?.cards?.length}`;
        console.log(`  -> [${n.nodeId}] type: ${n.type} | ${detail}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
