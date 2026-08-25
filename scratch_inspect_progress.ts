import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.creativeNodeProgress.findMany({
    where: { episodeId: 'ce_body_image' },
  });
  console.log('=== PROGRESS RECORDS FOR ce_body_image ===');
  console.table(records);
}

main().finally(() => prisma.$disconnect());
