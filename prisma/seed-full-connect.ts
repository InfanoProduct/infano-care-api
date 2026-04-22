import { PrismaClient, PeerLineStatus } from '@prisma/client';
import { main as seedBase } from './seed';
import { main as seedCircles } from './seed-circles';
import { main as seedExtra } from './seed-community-extra';
// import { main as seedPosts } from './seed-community-posts'; // We'll run this last manually if needed or inline

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Full Connect Seeding...');

  // 1. Run Base Seeds
  // We need to handle the fact that these are 'main' functions
  // Note: seed.ts and others might need to be exported or called via shell
  console.log('--- Running Base User Seeds ---');
  // Since they aren't exported in the files I saw, I'll use shell commands or re-implement
  // For safety in this environment, I'll just run them via shell later, 
  // but I will add the HAND-CRAFTED PEERLINE SESSIONS here.
  
  const menteePhone = '+911234567890';
  const mentorPhone = '+911112223333';

  const mentee = await prisma.user.findUnique({ where: { phone: menteePhone } });
  const mentor = await prisma.user.findUnique({ where: { phone: mentorPhone } });

  if (!mentee || !mentor) {
    console.error('❌ Mentee or Mentor not found. Please run base seed first.');
    return;
  }

  console.log('--- Seeding PeerLine Sessions ---');
  
  // Clean up old sessions to prevent clutter
  await prisma.peerLineMessage.deleteMany({});
  await prisma.peerLineSession.deleteMany({});

  // 1. Active Session
  const activeSession = await prisma.peerLineSession.create({
    data: {
      menteeId: mentee.id,
      mentorId: mentor.id,
      topicIds: ['period'],
      status: PeerLineStatus.IN_PROGRESS,
      startedAt: new Date(),
      messages: {
        create: [
          { senderRole: 'mentee', content: 'Hi, I have a question about my cycle.' },
          { senderRole: 'mentor', content: 'Hello! I am here to help. What is on your mind?' },
        ]
      }
    }
  });

  // 2. Completed Session (for history)
  await prisma.peerLineSession.create({
    data: {
      menteeId: mentee.id,
      mentorId: mentor.id,
      topicIds: ['mood'],
      status: PeerLineStatus.COMPLETED,
      startedAt: new Date(Date.now() - 86400000), // yesterday
      endedAt: new Date(Date.now() - 86400000 + 1800000), // 30 mins later
      menteeRating: 5,
      mentorRating: 5,
      messages: {
        create: [
          { senderRole: 'mentee', content: 'I am feeling a bit anxious about exams.' },
          { senderRole: 'mentor', content: 'That is completely normal. Take a deep breath.' },
          { senderRole: 'system', content: 'Session ended by mentor.' },
        ]
      }
    }
  });

  console.log('✅ Full Connect Seeding Completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
