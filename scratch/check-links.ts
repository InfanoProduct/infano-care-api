import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- Parent Links in DB ---');
  const links = await prisma.parentLink.findMany({
    include: {
      parent: { select: { username: true, role: true } },
      teen: { select: { username: true, role: true } }
    }
  });
  console.log(links);
}

main().catch(console.error).finally(() => prisma.$disconnect());
