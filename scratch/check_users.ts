import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const topics = await prisma.peerLineTopic.findMany();
  console.log('Topics in DB:', topics);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
