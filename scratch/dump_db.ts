import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    include: {
      episodes: true,
    },
  });

  console.log(JSON.stringify(journeys, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
