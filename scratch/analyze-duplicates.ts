import { prisma } from "../src/db/client.js";

async function analyzeDuplicates() {
  const ids = [
    '1816e51a-f1eb-4d69-b2e3-2dad8bc33b9a', // +919742802062 (New)
    '81354ebe-7f47-430e-bd8b-34e9452771ca', // 9742802062 (Old/Real)
    'c74e409b-904f-4cd5-8d01-e53a404486fe', // +917209536820 (New)
    '287fa4fa-44da-4c20-860c-90d86e27c02b'  // 7209536820 (Old/Real)
  ];

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    include: {
      peerApplication: true,
      profile: true
    }
  });

  users.forEach(u => {
    console.log(`\nUser ID: ${u.id}`);
    console.log(`Phone: ${u.phone}`);
    console.log(`Role: ${u.role}`);
    console.log(`Has Application: ${!!u.peerApplication}`);
    if (u.peerApplication) console.log(`Application Status: ${u.peerApplication.status}`);
    console.log(`Profile DisplayName: ${u.profile?.displayName}`);
  });
}

analyzeDuplicates().catch(console.error);
