import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findActiveSessions() {
  try {
    const sessions = await prisma.peerLineSession.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      },
      include: {
        mentor: { select: { phone: true } },
        mentee: { select: { phone: true } }
      }
    });

    console.log('Active/Queued/Matching Sessions:', JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findActiveSessions();
