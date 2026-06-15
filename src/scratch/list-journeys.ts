import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying journeys...');
  const journeys = await prisma.learningJourney.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      episodes: {
        select: {
          id: true,
          title: true,
          slug: true,
          order: true
        }
      }
    }
  });
  console.log('Journeys in DB:', JSON.stringify(journeys, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
