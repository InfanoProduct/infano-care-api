import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const menteeId = '5b640a75-f79b-4415-8e2d-56fb1572aba6';
    
    const mentor = await prisma.user.findFirst({
      where: { 
        profile: {
          displayName: { contains: 'Jessica Bloom' }
        }
      },
      include: { profile: true }
    });

    if (!mentor) {
      console.log('Mentor (Jessica Bloom) not found');
      return;
    }

    console.log('Mentor found:', mentor.id);

    // Check if Jessica Bloom is available
    await prisma.profile.update({
      where: { userId: mentor.id },
      data: { isAvailable: true, mentorStatus: 'certified' }
    });
    console.log('Jessica Bloom marked as available and certified');

    const session = await prisma.peerLineSession.findFirst({
      where: {
        menteeId: menteeId,
        status: { in: ['MATCHING', 'QUEUED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (session) {
      console.log('Found session:', session.id, 'updating to ACTIVE with Jessica Bloom...');
      await prisma.peerLineSession.update({
        where: { id: session.id },
        data: {
          mentorId: mentor.id,
          status: 'ACTIVE',
          matchedAt: new Date(),
          startedAt: new Date()
        }
      });
      console.log('Session activated');
    } else {
      console.log('No matching or queued session found to activate.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
