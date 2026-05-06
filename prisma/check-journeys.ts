import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journeys = await prisma.learningJourney.findMany({
    include: { _count: { select: { episodes: true } } }
  });

  console.log('--- Learning Journeys ---');
  journeys.forEach(j => {
    console.log(`${j.title} (slug: ${j.slug}, id: ${j.id}) - Episodes: ${j._count.episodes}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
