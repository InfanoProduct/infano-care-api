import { prisma } from "../src/db/client.js";

async function checkTeenPeers() {
  const users = await prisma.user.findMany({
    where: {
      role: 'TEEN',
      peerApplication: {
        status: 'approved'
      }
    },
    include: {
      peerApplication: true
    }
  });

  console.log(`Found ${users.length} TEEN users with approved peer applications:`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Phone: ${u.phone}, Role: ${u.role}, App Status: ${u.peerApplication?.status}`);
  });

  // Also check if any user has 'certified' status but role is still TEEN
  const certifiedTeens = await prisma.user.findMany({
    where: {
      role: 'TEEN',
      profile: {
        mentorStatus: 'certified'
      }
    },
    include: {
      peerApplication: true,
      profile: true
    }
  });

  console.log(`\nFound ${certifiedTeens.length} TEEN users with certified mentorStatus:`);
  certifiedTeens.forEach(u => {
    console.log(`- ID: ${u.id}, Phone: ${u.phone}, Role: ${u.role}, Mentor Status: ${u.profile?.mentorStatus}, App Status: ${u.peerApplication?.status}`);
  });
}

checkTeenPeers().catch(console.error);
