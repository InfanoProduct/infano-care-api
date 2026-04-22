import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  try {
    const journeys = await prisma.learningJourney.findMany({
      include: { episodes: true }
    });
    fs.writeFileSync('db-debug.json', JSON.stringify(journeys, null, 2));
    console.log(`Wrote ${journeys.length} journeys to db-debug.json`);
  } catch (e: any) {
    fs.writeFileSync('db-debug.json', JSON.stringify({ error: e.message, stack: e.stack }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
