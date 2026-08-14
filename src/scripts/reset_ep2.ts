import { prisma } from "../db/client.js";

async function main() {
  console.log("🧹 Resetting all user progress records for Episode 2 (ce_growing_pains)...");
  
  const deletedProgress = await prisma.creativeNodeProgress.deleteMany({
    where: { episodeId: "ce_growing_pains" }
  });
  
  const deletedGigi = await prisma.creativeAskGigiEntry.deleteMany({
    where: { episodeId: "ce_growing_pains" }
  });

  console.log(`✅ Deleted ${deletedProgress.count} node progress records and ${deletedGigi.count} Gigi Q&A entries for episode ce_growing_pains.`);
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
