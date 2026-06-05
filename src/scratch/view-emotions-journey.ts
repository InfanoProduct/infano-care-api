import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journey = await prisma.learningJourney.findUnique({
    where: { slug: 'understanding-emotions' },
    include: { episodes: true }
  });
  console.log('Journey Detail:', JSON.stringify(journey, null, 2));
}

main().finally(() => prisma.$disconnect());
