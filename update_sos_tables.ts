import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Adding missing columns to TrustedContact...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "TrustedContact" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;`);
  } catch(e) { console.log("isVerified might already exist:", (e as any).message); }
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "TrustedContact" ADD COLUMN "consentStatus" TEXT NOT NULL DEFAULT 'PENDING';`);
  } catch(e) { console.log("consentStatus might already exist:", (e as any).message); }
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "TrustedContact" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
  } catch(e) { console.log("updatedAt might already exist:", (e as any).message); }

  console.log("Adding missing columns to SosIncident...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SosIncident" ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
  } catch(e) { console.log("startedAt might already exist:", (e as any).message); }
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SosIncident" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
  } catch(e) { console.log("updatedAt might already exist:", (e as any).message); }

  console.log("Adding missing columns to SosIncidentEvent...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SosIncidentEvent" ADD COLUMN "batteryInfo" TEXT;`);
  } catch(e) { console.log("batteryInfo might already exist:", (e as any).message); }

  console.log("Columns added successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
