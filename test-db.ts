import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    include: { episodes: true }
  });
  console.log('Journeys found:', journeys.length);
  if (journeys.length > 0) {
    console.log('First journey episodes count:', journeys[0].episodes?.length);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
