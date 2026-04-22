
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Content Check ---');

  const journeyCount = await prisma.learningJourney.count();
  console.log(`LearningJourneys: ${journeyCount}`);

  if (journeyCount > 0) {
    const journeys = await prisma.learningJourney.findMany({
      include: {
        _count: {
          select: { episodes: true }
        }
      },
      take: 5
    });
    console.log('Sample Journeys:');
    journeys.forEach(j => {
      console.log(`- [${j.id}] ${j.title} (${j._count.episodes} episodes)`);
    });
  }

  const episodeCount = await prisma.episode.count();
  console.log(`\nEpisodes: ${episodeCount}`);

  if (episodeCount > 0) {
    const episodes = await prisma.episode.findMany({
      take: 3,
      include: {
        journey: {
          select: { title: true }
        }
      }
    });
    console.log('Sample Episodes:');
    episodes.forEach(e => {
      console.log(`- [${e.id}] ${e.title} (Journey: ${e.journey.title})`);
      // console.log('  Content:', JSON.stringify(e.content, null, 2).substring(0, 200) + '...');
    });
  }

  const progressCount = await prisma.userProgress.count();
  console.log(`\nUserProgress entries: ${progressCount}`);

  const reflectionCount = await prisma.reflection.count();
  console.log(`Reflections: ${reflectionCount}`);

  console.log('\n--- End of Check ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
