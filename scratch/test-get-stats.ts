import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

async function main() {
  const { PeerLineService } = await import("../src/modules/peerline/peerline.service.js");
  const { prisma } = await import("../src/db/client.js");

  const service = new PeerLineService();
  const mentorId = "2128fc03-b656-4c07-8698-9fb434f2c889";
  const stats = await service.getMentorStats(mentorId);
  const status = await service.getMentorStatus(mentorId);

  console.log("=== getMentorStats ===");
  console.log("queueCount:", stats.queueCount);
  console.log("activeSessions:", JSON.stringify(stats.activeSessions, null, 2));

  console.log("=== getMentorStatus ===");
  console.log("queue_count:", status.queue_count);

  await prisma.$disconnect();
}

main().catch(console.error);
