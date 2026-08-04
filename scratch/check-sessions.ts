import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { prisma } from "../src/db/client.js";

async function main() {
  const sessions = await prisma.peerLineSession.findMany({
    include: {
      mentee: { include: { profile: true } },
      mentor: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("=== ALL PEER LINE SESSIONS in DB ===");
  sessions.forEach((s) => {
    console.log({
      id: s.id,
      menteeId: s.menteeId,
      menteePhone: s.mentee?.phone,
      menteeName: s.mentee?.profile?.displayName,
      mentorId: s.mentorId,
      mentorPhone: s.mentor?.phone,
      mentorName: s.mentor?.profile?.displayName,
      status: s.status,
      requestedMentorId: s.requestedMentorId,
      createdAt: s.createdAt,
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
