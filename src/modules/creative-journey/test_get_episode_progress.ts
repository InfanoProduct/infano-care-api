import { prisma } from "../../db/client.js";
import { CreativeJourneyService } from "./creative-journey.service.js";

async function main() {
  const userId = "be5e53fd-6781-469b-b7a6-8ad3fff00f2a";
  const episodeId = "ce_skin_stories";

  console.log(`Running getEpisodeProgress for user ${userId} and episode ${episodeId}...`);
  const progress = await CreativeJourneyService.getEpisodeProgress(userId, episodeId);

  console.log("\nUpdated Node Progress in DB:");
  console.table(
    progress.map((p) => ({
      nodeId: p.nodeId,
      status: p.status,
      xpEarned: p.xpEarned,
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
