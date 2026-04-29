import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journey = await prisma.learningJourney.findFirst({
    where: { title: { contains: "Body Positivity" } }
  });

  if (!journey) {
    console.log("Journey not found");
    return;
  }

  // Ensure journey itself is not marked strictly premium if we want to show mixed state
  await prisma.learningJourney.update({
    where: { id: journey.id },
    data: { isPremium: false }
  });

  // Get current max order
  const existingEpisodes = await prisma.episode.findMany({
    where: { journeyId: journey.id },
    orderBy: { order: 'desc' }
  });
  
  const currentMaxOrder = existingEpisodes.length > 0 ? existingEpisodes[0].order : 0;
  
  // Create 3 premium episodes
  for (let i = 1; i <= 3; i++) {
    await prisma.episode.create({
      data: {
        journeyId: journey.id,
        title: `Premium Deep Dive ${i}`,
        description: `This is premium episode number ${i}`,
        points: 100,
        isActive: true,
        isPremium: true,
        order: currentMaxOrder + i
      }
    });
    console.log(`Created Premium Episode ${i}`);
  }

  console.log("Done adding premium episodes.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
