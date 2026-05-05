import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const mentee = await prisma.user.findFirst({
      where: { phone: '+919742802062' }
    });

    if (!mentee) {
      console.log('Mentee not found');
      return;
    }

    console.log('Mentee found:', mentee.id);

    const mentor = await prisma.user.findFirst({
      where: { 
        profile: {
          displayName: { contains: 'Priya Sharma' }
        }
      },
      include: { profile: true }
    });


    if (!mentor) {
      console.log('Mentor (Priya Sharma) not found');
      return;
    }

    console.log('Mentor found:', mentor.id);

    const session = await prisma.peerLineSession.findFirst({
      where: {
        menteeId: mentee.id,
        mentorId: mentor.id,
        status: 'MATCHING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
       // Also check for sessions with no mentor yet if it was just requested
       const openSession = await prisma.peerLineSession.findFirst({
         where: {
           menteeId: mentee.id,
           status: 'MATCHING'
         },
         orderBy: { createdAt: 'desc' }
       });
       if (openSession) {
         console.log('Open session found, assigning to Priya Sharma...');
         await prisma.peerLineSession.update({
           where: { id: openSession.id },
           data: {
             mentorId: mentor.id,
             status: 'ACTIVE',
             matchedAt: new Date(),
             startedAt: new Date()
           }
         });
         console.log('Session activated for Priya Sharma');
       } else {
         console.log('No matching or active session found for this mentee');
       }
    } else {
      console.log('Session found, updating to ACTIVE...');
      await prisma.peerLineSession.update({
        where: { id: session.id },
        data: {
          status: 'ACTIVE',
          matchedAt: new Date(),
          startedAt: new Date()
        }
      });
      console.log('Session activated');
    }
  } catch (e) {
    console.error('Error connecting to database:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
