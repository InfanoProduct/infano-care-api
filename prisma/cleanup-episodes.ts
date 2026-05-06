import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journey = await prisma.learningJourney.findUnique({
    where: { slug: 'peerline-mentor-certification' }
  });

  if (!journey) {
    console.log('Journey not found');
    return;
  }

  const validSlugs = [
    'what-is-peer-support',
    'listening-without-fixing',
    'safeguarding-crisis',
    'mentor-wellbeing'
  ];

  const deleted = await prisma.episode.deleteMany({
    where: {
      journeyId: journey.id,
      slug: { notIn: validSlugs }
    }
  });

  console.log(`Cleaned up ${deleted.count} old episodes.`);
  
  const episodes = await prisma.episode.findMany({
    where: { journeyId: journey.id },
    orderBy: { order: 'asc' }
  });
  
  console.log('Current episodes:', episodes.map(e => e.title));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
