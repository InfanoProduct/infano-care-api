import { prisma } from "../../db/client.js";
import { CreativeJourneyService } from "./creative-journey.service.js";

async function main() {
  console.log("Backfilling and syncing progress across all users and episodes...");

  const users = await prisma.user.findMany({ select: { id: true } });
  const episodes = await prisma.creativeEpisode.findMany({ select: { id: true } });

  let syncedCount = 0;
  for (const u of users) {
    for (const ep of episodes) {
      await CreativeJourneyService.getEpisodeProgress(u.id, ep.id);
      syncedCount++;
    }
  }

  console.log(`Successfully synced ${syncedCount} user-episode progress maps in PostgreSQL!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
