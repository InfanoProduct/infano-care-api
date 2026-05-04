import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: Cleaning up existing PeerLine topics...');
  await prisma.peerLineTopic.deleteMany();

  const topics = [
    {
      id: 'period',
      name: 'Period & Puberty',
      emoji: '🩸',
      accentColor: '#EF4444', // Red
      sortOrder: 1,
    },
    {
      id: 'mood',
      name: 'Mental Health & Mood',
      emoji: '🧠',
      accentColor: '#8B5CF6', // Purple
      sortOrder: 2,
    },
    {
      id: 'anxiety',
      name: 'Stress & Anxiety',
      emoji: '😰',
      accentColor: '#3B82F6', // Blue
      sortOrder: 3,
    },
    {
      id: 'body',
      name: 'Body Confidence',
      emoji: '✨',
      accentColor: '#EC4899', // Pink
      sortOrder: 4,
    },
    {
      id: 'relations',
      name: 'Relationships',
      emoji: '💞',
      accentColor: '#F43F5E', // Rose
      sortOrder: 5,
    },
    {
      id: 'family',
      name: 'Family Dynamics',
      emoji: '🏠',
      accentColor: '#F59E0B', // Amber
      sortOrder: 6,
    },
    {
      id: 'school',
      name: 'School & Academics',
      emoji: '📚',
      accentColor: '#14B8A6', // Teal
      sortOrder: 7,
    },
  ];

  console.log('Seed: Creating PeerLine topics...');

  for (const topic of topics) {
    await prisma.peerLineTopic.upsert({
      where: { id: topic.id },
      update: topic,
      create: topic,
    });
  }

  console.log('Seed: PeerLine topics updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
