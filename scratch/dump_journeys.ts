
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    include: { episodes: true }
  });

  console.log(JSON.stringify(journeys, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
