import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb() {
  try {
    const journeys = await prisma.learningJourney.findMany({
      include: { episodes: true }
    });
    console.log('Journeys found:', journeys.length);
    console.log(JSON.stringify(journeys, null, 2));
  } catch (error) {
    console.error('Error fetching journeys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
