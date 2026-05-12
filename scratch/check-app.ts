import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.peerApplication.findMany({
    take: 2,
    where: {
      episodeAnswers: {
        not: null
      }
    }
  });
  console.log(JSON.stringify(apps, null, 2));
}

main().finally(() => prisma.$disconnect());
