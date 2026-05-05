import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const sessions = await prisma.peerLineSession.findMany({
      where: {
        OR: [
          { menteeId: '5b640a75-f79b-4415-8e2d-56fb1572aba6' },
          { mentorId: '9c98c94a-61e7-4724-8f3f-b08928f5146e' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Last 5 sessions:');
    sessions.forEach(s => {
      console.log(`ID: ${s.id}, Status: ${s.status}`);
      console.log(`  Mentee - Rating: ${s.menteeRating}, Note: ${s.menteeNote}`);
      console.log(`  Mentor - Rating: ${s.mentorRating}, Note: ${s.mentorNote}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
