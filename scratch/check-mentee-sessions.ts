import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

async function main() {
  const { prisma } = await import("../src/db/client.js");

  const menteeId = "50925891-b581-4342-9ec1-8029a5813196";
  const mentorId = "2128fc03-b656-4c07-8698-9fb434f2c889";

  const menteeSessions = await prisma.peerLineSession.findMany({
    where: { menteeId },
    orderBy: { createdAt: "desc" }
  });

  console.log("=== All Sessions for Mentee (+911234567891) ===");
  console.log(JSON.stringify(menteeSessions, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
