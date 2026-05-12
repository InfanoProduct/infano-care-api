import { prisma } from "../src/db/client.js";

async function fixLoginIssue() {
  const dupPairs = [
    { old: '81354ebe-7f47-430e-bd8b-34e9452771ca', neu: '1816e51a-f1eb-4d69-b2e3-2dad8bc33b9a', phone: '+919742802062' },
    { old: '287fa4fa-44da-4c20-860c-90d86e27c02b', neu: 'c74e409b-904f-4cd5-8d01-e53a404486fe', phone: '+917209536820' }
  ];

  for (const pair of dupPairs) {
    console.log(`Processing pair for ${pair.phone}`);
    
    try {
      // 1. Rename duplicate phone to free up the slot
      console.log(`Renaming duplicate user ${pair.neu} phone...`);
      await prisma.user.update({
        where: { id: pair.neu },
        data: { phone: `${pair.phone}_dup_${Date.now()}` }
      });
      
      // 2. Update original user phone
      console.log(`Updating original user ${pair.old} to ${pair.phone}`);
      await prisma.user.update({
        where: { id: pair.old },
        data: { phone: pair.phone }
      });
      
      // 3. Update PeerApplication phone
      await prisma.peerApplication.update({
        where: { userId: pair.old },
        data: { phone: pair.phone }
      });

      console.log(`Successfully fixed ${pair.phone}`);
    } catch (err) {
      console.error(`Error processing ${pair.phone}:`, err.message);
    }
  }

  // Final check: normalize any remaining 10-digit numbers
  const allUsers = await prisma.user.findMany({
    where: { NOT: { phone: { startsWith: '+' } } }
  });

  for (const u of allUsers) {
    if (u.phone && /^\d{10}$/.test(u.phone)) {
      const norm = `+91${u.phone}`;
      console.log(`Normalizing ${u.phone} -> ${norm}`);
      try {
        await prisma.user.update({ where: { id: u.id }, data: { phone: norm } });
      } catch (err) {
        console.log(`Could not normalize ${u.phone} (probably a duplicate exists): ${err.message}`);
      }
    }
  }
}

fixLoginIssue().catch(console.error);
