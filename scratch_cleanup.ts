import { prisma } from "./src/db/client.js";

async function cleanupAndReseed() {
  console.log("🧹 Cleaning up duplicate orphaned episode and journey records...");

  await prisma.creativeNodeProgress.deleteMany({
    where: {
      episodeId: { in: ["ep1_bt", "ep4_pp", "ep7_cb"] }
    }
  }).catch((e) => console.log("Progress clean error:", e.message));

  await prisma.creativeEpisode.deleteMany({
    where: {
      id: { in: ["ep1_bt", "ep4_pp", "ep7_cb"] }
    }
  }).catch((e) => console.log("Episode clean error:", e.message));

  await prisma.creativeJourney.deleteMany({
    where: {
      id: { in: ["cj_body", "cj_period"] }
    }
  }).catch((e) => console.log("Journey clean error:", e.message));

  console.log("✅ Duplicate orphaned records removed!");
}

cleanupAndReseed().catch(console.error).finally(() => prisma.$disconnect());
