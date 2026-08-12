import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const chapters = await prisma.lmsChapter.findUnique({
    where: { id: 'c1eefa5c-947e-4ecb-88a0-02b48520e439' },
    include: { video: true }
  });
  console.log(JSON.stringify(chapters, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
