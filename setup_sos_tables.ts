import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Creating TrustedContact table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrustedContact" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "relation" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TrustedContact_pkey" PRIMARY KEY ("id")
    );
  `);
  
  console.log("Creating SosIncident table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SosIncident" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "lat" DOUBLE PRECISION,
        "lng" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolvedAt" TIMESTAMP(3),
        CONSTRAINT "SosIncident_pkey" PRIMARY KEY ("id")
    );
  `);

  console.log("Creating SosIncidentEvent table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SosIncidentEvent" (
        "id" TEXT NOT NULL,
        "incidentId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "lat" DOUBLE PRECISION,
        "lng" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SosIncidentEvent_pkey" PRIMARY KEY ("id")
    );
  `);
  
  console.log("Adding Foreign Keys...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "TrustedContact" ADD CONSTRAINT "TrustedContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch(e) { console.log("FK TrustedContact exists or error:", (e as any).message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SosIncident" ADD CONSTRAINT "SosIncident_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch(e) { console.log("FK SosIncident exists or error:", (e as any).message); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SosIncidentEvent" ADD CONSTRAINT "SosIncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SosIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch(e) { console.log("FK SosIncidentEvent exists or error:", (e as any).message); }
  
  console.log("SOS Tables created successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
