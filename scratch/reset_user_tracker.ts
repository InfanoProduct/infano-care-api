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

  // Update CycleProfile to remove lastPeriodStart and keep watching_waiting mode
  await (prisma as any).cycleProfile.update({
    where: { userId: user.id },
    data: {
      trackerMode: 'watching_waiting',
      lastPeriodStart: null,
      lastPeriodEnd: null,
      currentPhase: 'waiting',
      currentCycleDay: null,
      predictedNextStart: null,
    },
  });

  console.log('User tracker data reset to watching_waiting with null lastPeriodStart');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
