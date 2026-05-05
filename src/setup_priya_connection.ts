import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding or creating user +919742802062...');
  
  let user = await prisma.user.findFirst({
    where: { 
      OR: [
        { phone: '+919742802062' },
        { phone: '+91 9742802062' }
      ]
    }
  });

  if (!user) {
    console.log('User not found. Creating user...');
    user = await prisma.user.create({
      data: {
        phone: '+919742802062',
        profile: {
          create: {
            displayName: 'Test User',
          }
        }
      }
    });
  }

  console.log('Finding mentor Priya Sharma...');
  const mentorProfile = await prisma.profile.findFirst({
    where: { displayName: 'Priya Sharma' },
    include: { user: true }
  });

  if (!mentorProfile) {
    console.log('Mentor Priya Sharma not found.');
    return;
  }

  const mentorId = mentorProfile.userId;

  console.log(`Creating accepted session between User ${user.id} and Mentor ${mentorId}...`);

  // Create the session
  const session = await prisma.peerLineSession.create({
    data: {
      menteeId: user.id,
      mentorId: mentorId,
      status: 'ACTIVE', // Accepted and currently chatting
      topicIds: mentorProfile.certifiedTopicIds, // Using mentor's topics as dummy
    }
  });

  console.log('Session created:', session.id);

  // Add initial messages
  await prisma.peerLineMessage.createMany({
    data: [
      {
        sessionId: session.id,
        senderRole: 'mentee',
        content: 'Hi Priya, I need some help with exam stress.',
      },
      {
        sessionId: session.id,
        senderRole: 'mentor',
        content: 'Hello! I would be happy to help. How can I assist you today?',
      }
    ]
  });


  console.log('Dummy messages added.');
  console.log('Successfully set up the accepted connection request.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
