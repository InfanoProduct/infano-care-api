import { prisma } from "../src/db/client.js";

async function migratePhoneNumbers() {
  console.log("Starting phone number migration and deduplication...");

  const users = await prisma.user.findMany({
    include: {
      peerApplication: true,
      profile: true
    }
  });

  const phoneGroups = new Map<string, any[]>();

  for (const user of users) {
    let normalized = user.phone;
    if (user.phone && /^\d{10}$/.test(user.phone)) {
      normalized = `+91${user.phone}`;
    }

    if (!phoneGroups.has(normalized)) {
      phoneGroups.set(normalized, []);
    }
    phoneGroups.get(normalized)!.push(user);
  }

  for (const [normalizedPhone, group] of phoneGroups.entries()) {
    if (group.length === 1) {
      // No duplicate, just normalize if needed
      const user = group[0];
      if (user.phone !== normalizedPhone) {
        console.log(`Normalizing ${user.phone} -> ${normalizedPhone} for user ${user.id}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: normalizedPhone }
        });
        
        if (user.peerApplication) {
          await prisma.peerApplication.update({
            where: { userId: user.id },
            data: { phone: normalizedPhone }
          });
        }
      }
    } else {
      // Duplicate found!
      console.log(`\nDuplicate found for ${normalizedPhone}:`);
      
      // Sort: priority to users with applications, then older accounts
      group.sort((a, b) => {
        if (!!a.peerApplication !== !!b.peerApplication) {
          return a.peerApplication ? -1 : 1;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const primary = group[0];
      const duplicates = group.slice(1);

      console.log(`Primary User: ${primary.id} (${primary.phone}) - keeping this one.`);
      
      for (const dup of duplicates) {
        console.log(`Duplicate User: ${dup.id} (${dup.phone}) - deleting.`);
        
        // Before deleting, check if it has any critical data we might need to move (optional for now)
        // For this specific app, most data is in peerApplication which we prioritized
        
        try {
          // Delete duplicate profile first if it exists (cascade might handle it but being safe)
          if (dup.profile) {
            await prisma.profile.delete({ where: { id: dup.profile.id } }).catch(() => {});
          }
          await prisma.user.delete({ where: { id: dup.id } });
        } catch (err) {
          console.error(`Failed to delete duplicate ${dup.id}:`, err.message);
        }
      }

      // Finally, ensure primary has the normalized phone
      if (primary.phone !== normalizedPhone) {
        console.log(`Normalizing primary ${primary.phone} -> ${normalizedPhone}`);
        await prisma.user.update({
          where: { id: primary.id },
          data: { phone: normalizedPhone }
        });
        
        if (primary.peerApplication) {
          await prisma.peerApplication.update({
            where: { userId: primary.id },
            data: { phone: normalizedPhone }
          });
        }
      }
    }
  }

  console.log("\nMigration completed.");
}

migratePhoneNumbers().catch(console.error);
