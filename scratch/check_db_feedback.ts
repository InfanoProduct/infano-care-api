import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const sessions = await prisma.peerLineSession.findMany({
      where: {
        menteeId: '5b640a75-f79b-4415-8e2d-56fb1572aba6'
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Last 5 sessions for mentee:');
    sessions.forEach(s => {
      console.log(`ID: ${s.id}, Status: ${s.status}, Rating: ${s.menteeRating}, Note: ${s.menteeNote}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
