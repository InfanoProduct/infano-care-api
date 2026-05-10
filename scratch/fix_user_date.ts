import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phone = '+919742802062';
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  // Update CycleProfile: snap 18:30 UTC of April 19 to 00:00 UTC of April 20
  const correctStart = new Date('2026-04-20T00:00:00Z');

  await (prisma as any).cycleProfile.update({
    where: { userId: user.id },
    data: {
      lastPeriodStart: correctStart,
    },
  });

  // Also check if there are any CycleRecords that need fixing
  await (prisma as any).cycleRecord.updateMany({
    where: { userId: user.id, startDate: { lt: new Date('2026-04-20T00:00:00Z') } },
    data: {
      startDate: correctStart,
      periodStartDate: correctStart,
    }
  });

  console.log('User tracker data normalized to April 20th UTC midnight');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
