import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const programs = await prisma.program.findMany({
    select: { id: true, title: true, thumbnailUrl: true }
  });
  console.log('Programs count:', programs.length);
  console.log(JSON.stringify(programs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
