import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.peerApplication.findMany({
    where: {
      certificationStatus: 'certified'
    },
    select: {
      userId: true,
      name: true,
      certificateId: true
    }
  });

  console.log('Certified Peer Applications:');
  console.table(apps);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
