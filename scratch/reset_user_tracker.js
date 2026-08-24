import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phoneVariants = ['+919742802062', '9742802062', '+91 9742802062'];
  console.log('Searching for user with phone variants:', phoneVariants);

  const user = await prisma.user.findFirst({
    where: {
      phone: { in: phoneVariants }
    }
  });

  if (!user) {
    console.error('User not found with phone variants!');
    const users = await prisma.user.findMany({ select: { id: true, phone: true, username: true }, take: 10 });
    console.log('Sample users in DB:', users);
    return;
  }

  console.log('Found user:', user.id, user.phone, user.username);

  // Delete cycle logs & records
  const deletedLogs = await prisma.cycleLog.deleteMany({ where: { userId: user.id } });
  const deletedRecords = await prisma.cycleRecord.deleteMany({ where: { userId: user.id } });
  const deletedLedger = await prisma.pointsLedger.deleteMany({ where: { userId: user.id, sourceType: 'tracker_setup' } });
  console.log(`Deleted ${deletedLogs.count} cycle logs, ${deletedRecords.count} cycle records, and ${deletedLedger.count} tracker setup ledger entries.`);

  // Reset or delete cycle profile
  const profile = await prisma.cycleProfile.findUnique({ where: { userId: user.id } });
  if (profile) {
    await prisma.cycleProfile.update({
      where: { userId: user.id },
      data: {
        trackerMode: 'watching_waiting',
        lastPeriodStart: null,
        lastPeriodEnd: null,
        setupCompletedAt: null,
        currentPhase: 'waiting',
        currentCycleDay: null,
        predictedNextStart: null,
        predictionWindowEarly: null,
        predictionWindowLate: null,
        confidenceLevel: 'none',
        currentLogStreak: 0,
        longestLogStreak: 0,
        lastLogDate: null
      }
    });
    console.log('Reset CycleProfile for user to watching_waiting unconfigured state.');
  }

  console.log('SUCCESS! Period tracker data and setup reward cleared for user +91 9742802062.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
