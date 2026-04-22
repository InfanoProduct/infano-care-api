import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  try {
    const all = await prisma.weeklyChallenge.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    if (all.length > 1) {
      const keepId = all[0].id; // Keep the latest one
      const deleteIds = all.slice(1).map(c => c.id);
      
      console.log(`Keeping challenge: ${keepId}`);
      console.log(`Deleting ${deleteIds.length} older challenges...`);
      
      const deleted = await prisma.weeklyChallenge.deleteMany({
        where: { id: { in: deleteIds } }
      });
      console.log(`Deleted ${deleted.count} challenges.`);
    } else {
      console.log('Only one or zero challenges found. No cleanup needed.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

cleanup();
