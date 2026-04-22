import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking tables...");
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables:", tables);
    
    console.log("Checking LearningJourney...");
    const journeys = await prisma.learningJourney.findMany();
    console.log("Journeys found:", journeys.length);
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
