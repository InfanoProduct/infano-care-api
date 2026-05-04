import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    include: { episodes: { orderBy: { order: 'asc' } } }
  });

  if (journeys.length >= 3) {
    // Journey 1: ALL FREE
    await prisma.learningJourney.update({
      where: { id: journeys[0].id },
      data: { isPremium: false }
    });
    for (const ep of journeys[0].episodes) {
      await prisma.episode.update({
        where: { id: ep.id },
        data: { isPremium: false }
      });
    }
    console.log(`Journey 1 ("${journeys[0].title}") set to FREE.`);

    // Journey 2: MIXED (Some Free, Some Premium)
    await prisma.learningJourney.update({
      where: { id: journeys[1].id },
      data: { isPremium: false }
    });
    for (let i = 0; i < journeys[1].episodes.length; i++) {
      await prisma.episode.update({
        where: { id: journeys[1].episodes[i].id },
        // First half free, second half premium
        data: { isPremium: i >= Math.ceil(journeys[1].episodes.length / 2) }
      });
    }
    console.log(`Journey 2 ("${journeys[1].title}") set to MIXED.`);

    // Journey 3: ALL PREMIUM
    await prisma.learningJourney.update({
      where: { id: journeys[2].id },
      data: { isPremium: true }
    });
    for (const ep of journeys[2].episodes) {
      await prisma.episode.update({
        where: { id: ep.id },
        data: { isPremium: true }
      });
    }
    console.log(`Journey 3 ("${journeys[2].title}") set to PREMIUM.`);

    // Any remaining journeys will be set to Premium
    for (let j = 3; j < journeys.length; j++) {
      await prisma.learningJourney.update({
        where: { id: journeys[j].id },
        data: { isPremium: true }
      });
      for (const ep of journeys[j].episodes) {
        await prisma.episode.update({
          where: { id: ep.id },
          data: { isPremium: true }
        });
      }
    }
  } else {
    console.log("Not enough journeys found to demonstrate all 3 states. Found:", journeys.length);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
