import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: '23khushijaiswal2003@gmail.com' },
    include: { profile: true, peerApplication: true }
  });

  console.log('User 23khushijaiswal2003@gmail.com:');
  console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
