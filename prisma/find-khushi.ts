import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { profile: true, peerApplication: true }
  });

  const matching = users.filter(u => 
    u.username?.includes('Khushi') || 
    u.profile?.displayName?.includes('Khushi') ||
    u.peerApplication?.name?.includes('Khushi')
  );

  console.log('Matching Users:');
  console.log(JSON.stringify(matching, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
