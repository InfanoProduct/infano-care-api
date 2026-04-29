import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    include: { episodes: true }
  });
  console.log(`Found ${journeys.length} journeys:`);
  for (const j of journeys) {
    console.log(`- ${j.title} (${j.episodes.length} episodes)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
