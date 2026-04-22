import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.learningJourney.count();
    console.log(`LearningJourney count: ${count}`);
    const journeys = await prisma.learningJourney.findMany({
        include: { episodes: true }
    });
    console.log(`Journeys: ${JSON.stringify(journeys, null, 2)}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
