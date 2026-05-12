import { prisma } from "../src/db/client.js";

async function cleanupGhosts() {
  const users = await prisma.user.findMany({
    where: { phone: { contains: '_dup_' } }
  });

  console.log(`Found ${users.length} ghost users to cleanup.`);

  for (const u of users) {
    console.log(`Attempting to delete ghost ${u.id} (${u.phone})...`);
    try {
      // Try to delete dependent records first
      await prisma.profile.deleteMany({ where: { userId: u.id } });
      await prisma.personalizationProfile.deleteMany({ where: { userId: u.id } });
      await prisma.notificationPreferences.deleteMany({ where: { userId: u.id } });
      
      // If CycleLog exists, try to delete it
      await prisma.cycleLog.deleteMany({ where: { userId: u.id } });

      await prisma.user.delete({ where: { id: u.id } });
      console.log(`Deleted ${u.id}`);
    } catch (err) {
      console.log(`Failed to delete ${u.id}: ${err.message}. Keeping as ghost.`);
    }
  }
}

cleanupGhosts().catch(console.error);
