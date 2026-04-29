import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    orderBy: { createdAt: 'asc' }
  });

  for (let i = 0; i < journeys.length; i++) {
    const isPremium = i >= 2;
    await prisma.$executeRawUnsafe(`UPDATE "LearningJourney" SET "isPremium" = ${isPremium} WHERE id = '${journeys[i].id}';`);
    console.log(`Updated "${journeys[i].title}" to isPremium: ${isPremium}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
