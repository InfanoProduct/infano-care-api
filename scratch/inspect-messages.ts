import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

async function main() {
  const { prisma } = await import("../src/db/client.js");

  const menteeId = "50925891-b581-4342-9ec1-8029a5813196";
  const mentorId = "2128fc03-b656-4c07-8698-9fb434f2c889";

  const sessions = await prisma.peerLineSession.findMany({
    where: {
      OR: [
        { menteeId },
        { mentorId }
      ]
    },
    include: {
      PeerLineMessage: { orderBy: { sentAt: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });

  console.log("=== All Sessions and Messages ===");
  for (const s of sessions) {
    console.log(`Session ID: ${s.id} | Status: ${s.status} | Mentee: ${s.menteeId} | Mentor: ${s.mentorId} | Created: ${s.createdAt.toISOString()}`);
    console.log(`Messages (${s.PeerLineMessage.length}):`);
    for (const m of s.PeerLineMessage) {
      console.log(`   [${m.senderRole}] ${m.content} (${m.sentAt.toISOString()})`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
