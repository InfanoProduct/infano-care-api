import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const profileCount = await prisma.profile.count();
  const appCount = await prisma.peerApplication.count();
  
  console.log('Database Stats:');
  console.log('Total Users:', userCount);
  console.log('Total Profiles:', profileCount);
  console.log('Total PeerApplications:', appCount);

  if (userCount > 0) {
    const latestUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { username: true, phone: true, role: true, createdAt: true }
    });
    console.log('Latest 5 Users:', latestUsers);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
