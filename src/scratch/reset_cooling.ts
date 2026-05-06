import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 'e6240956-8431-4980-9839-685bcf0ad5e3';
  
  console.log(`Resetting cooling period for user ${userId}...`);

  await prisma.peerApplication.update({
    where: { userId },
    data: {
      assessmentAttempts: 0,
      lockUntil: null,
      lastAttemptAt: null,
      certificationStatus: 'pending_training'
    }
  });

  console.log('Cooling period reset successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
