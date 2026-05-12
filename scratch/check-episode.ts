import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ep = await prisma.episode.findFirst({
    where: {
      slug: {
        contains: 'wellbeing'
      }
    }
  });
  console.log(JSON.stringify(ep, null, 2));
}

main().finally(() => prisma.$disconnect());
