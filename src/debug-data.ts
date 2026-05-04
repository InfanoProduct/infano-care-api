import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    include: {
      episodes: true,
      _count: {
        select: { episodes: true }
      }
    }
  });

  console.log('Journeys found:', journeys.length);
  journeys.forEach(j => {
    console.log(`Journey: ${j.title} (${j.id})`);
    console.log(`- Count: ${j._count.episodes}`);
    console.log(`- Episodes array length: ${j.episodes.length}`);
    j.episodes.forEach(e => {
      console.log(`  - Episode: ${e.title} (${e.id})`);
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
