import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "public"."LearningJourney" ADD COLUMN IF NOT EXISTS "isPremium" boolean NOT NULL DEFAULT false;');
  await prisma.$executeRawUnsafe('ALTER TABLE "public"."Episode" ADD COLUMN IF NOT EXISTS "isPremium" boolean NOT NULL DEFAULT false;');
  console.log('Columns added successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
