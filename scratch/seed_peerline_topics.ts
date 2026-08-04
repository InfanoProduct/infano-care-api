import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PeerLine Topics...');

  const topics = [
    {
      id: 'topic-mental-health',
      name: 'Mental & Emotional Health',
      emoji: '🧠',
      accentColor: '#8B5CF6',
      sortOrder: 1,
    },
    {
      id: 'topic-academic-stress',
      name: 'Academic & Exam Stress',
      emoji: '📚',
      accentColor: '#3B82F6',
      sortOrder: 2,
    },
    {
      id: 'topic-relationships',
      name: 'Relationships & Peer Pressure',
      emoji: '💬',
      accentColor: '#EC4899',
      sortOrder: 3,
    },
    {
      id: 'topic-self-esteem',
      name: 'Body Image & Self-Esteem',
      emoji: '✨',
      accentColor: '#F59E0B',
      sortOrder: 4,
    },
    {
      id: 'topic-personal-growth',
      name: 'Identity & Personal Growth',
      emoji: '🌱',
      accentColor: '#10B981',
      sortOrder: 5,
    },
    {
      id: 'topic-life-transitions',
      name: 'Family & Life Transitions',
      emoji: '🏡',
      accentColor: '#6366F1',
      sortOrder: 6,
    },
  ];

  for (const topic of topics) {
    await prisma.peerLineTopic.upsert({
      where: { id: topic.id },
      update: topic,
      create: topic,
    });
  }

  console.log('PeerLine Topics seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
