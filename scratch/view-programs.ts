import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- Active Programs in DB ---');
  const programs = await prisma.program.findMany({
    where: { isActive: true }
  });
  console.log(programs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
