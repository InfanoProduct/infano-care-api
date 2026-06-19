import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;');
  console.log("Dropped _prisma_migrations table.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
