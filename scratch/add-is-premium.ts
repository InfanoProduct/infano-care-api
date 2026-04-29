import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "LearningJourney" ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT false;`);
  console.log('Column isPremium added successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
