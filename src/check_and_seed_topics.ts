import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking PeerLine topics...');
  const topics = await prisma.peerLineTopic.findMany();
  console.log('Found topics:', topics);

  if (topics.length === 0) {
    console.log('No topics found. Seeding dummy topics...');
    const dummyTopics = [
      { name: 'Menstrual Health', emoji: '🩸', accentColor: '#EF4444', isActive: true, sortOrder: 1 },
      { name: 'Mental Wellbeing', emoji: '🧠', accentColor: '#8B5CF6', isActive: true, sortOrder: 2 },
      { name: 'Relationship Advice', emoji: '❤️', accentColor: '#EC4899', isActive: true, sortOrder: 3 },
      { name: 'Body Confidence', emoji: '✨', accentColor: '#F59E0B', isActive: true, sortOrder: 4 },
      { name: 'Sexual Education', emoji: '📚', accentColor: '#10B981', isActive: true, sortOrder: 5 },
      { name: 'Friendship & Peers', emoji: '👯‍♀️', accentColor: '#3B82F6', isActive: true, sortOrder: 6 },
    ];

    for (const topic of dummyTopics) {
      await prisma.peerLineTopic.create({ data: topic });
    }
    console.log('Seeded dummy topics.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
