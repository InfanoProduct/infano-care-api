import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSession() {
  console.log('--- Creating Test PeerLine Session ---');

  // 1. Find or create a mentee user
  let mentee = await prisma.user.findFirst({
    where: { phone: '+919998887776' }
  });

  if (!mentee) {
    mentee = await prisma.user.create({
      data: {
        phone: '+919998887776',
        birthYear: 2007, // 17 years old
        profile: {
          create: {
            displayName: 'Test Mentee',
          }
        }
      }
    });
    console.log(`Created new mentee user: ${mentee.phone}`);
  } else {
    console.log(`Using existing mentee user: ${mentee.phone}`);
  }

  // 2. Create a QUEUED session
  const session = await prisma.peerLineSession.create({
    data: {
      menteeId: mentee.id,
      topicIds: ['period', 'mood'],
      status: 'QUEUED',
      requestedVerified: false
    }
  });

  console.log(`✅ Created QUEUED session: ${session.id}`);
  console.log(`Topics: ${session.topicIds}`);
  console.log('\nNow go to the Mentor Dashboard in the app and click "Connect with mentee"');

  await prisma.$disconnect();
}

createTestSession().catch(err => {
  console.error(err);
  process.exit(1);
});
