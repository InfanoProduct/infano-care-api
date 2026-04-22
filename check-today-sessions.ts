import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSessions() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await prisma.peerLineSession.findMany({
      where: {
        createdAt: { gte: today }
      },
      include: {
        mentor: { select: { phone: true } },
        mentee: { select: { phone: true } }
      }
    });

    console.log('Sessions today:', JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();
