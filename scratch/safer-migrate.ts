import { prisma } from "../src/db/client.js";

async function saferMigrate() {
  const users = await prisma.user.findMany({
    include: { peerApplication: true }
  });

  const dupPairs = [
    { old: '81354ebe-7f47-430e-bd8b-34e9452771ca', neu: '1816e51a-f1eb-4d69-b2e3-2dad8bc33b9a', phone: '+919742802062' },
    { old: '287fa4fa-44da-4c20-860c-90d86e27c02b', neu: 'c74e409b-904f-4cd5-8d01-e53a404486fe', phone: '+917209536820' }
  ];

  for (const pair of dupPairs) {
    console.log(`Processing pair for ${pair.phone}`);
    
    // 1. Delete new one
    console.log(`Deleting duplicate user ${pair.neu}`);
    await prisma.profile.deleteMany({ where: { userId: pair.neu } });
    await prisma.user.delete({ where: { id: pair.neu } });
    
    // 2. Update old one
    console.log(`Updating original user ${pair.old} to ${pair.phone}`);
    await prisma.user.update({
      where: { id: pair.old },
      data: { phone: pair.phone }
    });
    
    await prisma.peerApplication.update({
      where: { userId: pair.old },
      data: { phone: pair.phone }
    });
  }

  // Final check and normalize any others
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    if (u.phone && /^\d{10}$/.test(u.phone)) {
      const norm = `+91${u.phone}`;
      console.log(`Normalizing ${u.phone} -> ${norm}`);
      await prisma.user.update({ where: { id: u.id }, data: { phone: norm } });
    }
  }
  
  console.log("Done.");
}

saferMigrate().catch(console.error);
