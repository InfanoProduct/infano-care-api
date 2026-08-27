import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.peerLineSession.findMany({
    include: {
      mentor: { include: { profile: true } },
      mentee: { include: { profile: true } },
      PeerLineMessage: true
    }
  });

  console.log('Sessions count:', sessions.length);
  for (const s of sessions) {
    console.log({
      id: s.id,
      status: s.status,
      mentorId: s.mentorId,
      mentorName: s.mentor?.profile?.displayName,
      menteeId: s.menteeId,
      menteeName: s.mentee?.profile?.displayName,
      messageCount: s.PeerLineMessage.length,
      startedAt: s.startedAt,
    });
  }
}

main().finally(() => prisma.$disconnect());
