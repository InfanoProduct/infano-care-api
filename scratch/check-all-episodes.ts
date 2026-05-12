import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const episodes = await prisma.episode.findMany({
    orderBy: { order: 'asc' }
  });
  episodes.forEach(ep => {
    console.log(`Episode ${ep.order}: ${ep.slug}`);
    console.log(`Reflection info:`, JSON.stringify(ep.content.activity || ep.content.reflection, null, 2));
    console.log('---');
  });
}

main().finally(() => prisma.$disconnect());
