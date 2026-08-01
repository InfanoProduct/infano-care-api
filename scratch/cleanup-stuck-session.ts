import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

async function main() {
  const { prisma } = await import("../src/db/client.js");

  const menteeId = "50925891-b581-4342-9ec1-8029a5813196";

  const updated = await prisma.peerLineSession.updateMany({
    where: {
      menteeId,
      status: "ACTIVE"
    },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      endReason: "manual_cleanup"
    }
  });

  console.log(`Cleaned up ${updated.count} stale active sessions for mentee`);
  await prisma.$disconnect();
}

main().catch(console.error);
