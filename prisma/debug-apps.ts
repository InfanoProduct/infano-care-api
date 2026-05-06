import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.peerApplication.findMany({
    include: {
      user: {
        select: {
          username: true,
          phone: true,
          peerOnboarding: true,
          role: true
        }
      }
    }
  });

  console.log('Peer Applications in DB:');
  console.log(JSON.stringify(apps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
