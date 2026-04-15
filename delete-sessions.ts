import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteSessions() {
  try {
    const result = await prisma.peerLineSession.deleteMany({
      where: {
        OR: [
          { menteeId: '1234567890' },
          { mentorId: '1234567890' }
        ]
      }
    });
    console.log(`Deleted ${result.count} sessions.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSessions();
