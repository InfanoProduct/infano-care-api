import { prisma } from '../src/db/client.js';
import { TrackerService } from '../src/modules/tracker/tracker.service.js';

async function seed() {
  const phone = '+919669341348';
  console.log(`[Seed] Starting seed for user ${phone}...`);

  try {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      console.error(`[Seed] User ${phone} not found!`);
      return;
    }
    const userId = user.id;

    // 1. Cleanup existing tracker data for this user
    console.log(`[Seed] Cleaning up existing tracker data...`);
    await prisma.$transaction([
      prisma.cycleLog.deleteMany({ where: { userId } }),
      prisma.cycleRecord.deleteMany({ where: { userId } }),
      prisma.cycleProfile.deleteMany({ where: { userId } }),
    ]);

    // 2. Create Initial Cycle Profile
    console.log(`[Seed] Creating Cycle Profile...`);
    await (prisma as any).cycleProfile.create({
      data: {
        userId,
        avgCycleLength: 28,
        avgPeriodDuration: 5,
        lastPeriodStart: new Date('2026-03-07T00:00:00.000Z'), // Needed for baseline
        trackerMode: 'active',
        setupCompletedAt: new Date(),
      }
    });

    // 3. Seed Cycle Records (Last 3 Months)
    console.log(`[Seed] Seeding Cycle Records...`);
    // Cycle 1: Jan 10 - Feb 7 (28 days)
    // Cycle 2: Feb 7 - Mar 7 (28 days)
    // Cycle 3: Mar 7 - Apr 4 (28 days)
    await (prisma as any).cycleRecord.createMany({
      data: [
        {
          userId,
          cycleNumber: 1,
          startDate: new Date('2026-01-10T00:00:00.000Z'),
          endDate: new Date('2026-02-07T00:00:00.000Z'),
          periodStartDate: new Date('2026-01-10T00:00:00.000Z'),
          periodEndDate: new Date('2026-01-15T00:00:00.000Z'),
          cycleLengthDays: 28,
          periodDurationDays: 5,
          isComplete: true,
        },
        {
          userId,
          cycleNumber: 2,
          startDate: new Date('2026-02-07T00:00:00.000Z'),
          endDate: new Date('2026-03-07T00:00:00.000Z'),
          periodStartDate: new Date('2026-02-07T00:00:00.000Z'),
          periodEndDate: new Date('2026-02-12T00:00:00.000Z'),
          cycleLengthDays: 28,
          periodDurationDays: 5,
          isComplete: true,
        },
        {
          userId,
          cycleNumber: 3,
          startDate: new Date('2026-03-07T00:00:00.000Z'),
          endDate: new Date('2026-04-04T00:00:00.000Z'),
          periodStartDate: new Date('2026-03-07T00:00:00.000Z'),
          periodEndDate: new Date('2026-03-12T00:00:00.000Z'),
          cycleLengthDays: 28,
          periodDurationDays: 5,
          isComplete: true,
        }
      ]
    });

    // 4. Seed Daily Logs (Last 5 Days: Apr 3, 4, 5, 6, 7)
    console.log(`[Seed] Seeding Daily Logs (Last 5 Days)...`);
    const logs = [
      { date: '2026-04-03T00:00:00.000Z', flow: 'none', moodPrimary: 'energetic' },
      { date: '2026-04-04T00:00:00.000Z', flow: 'medium', symptoms: ['cramps'] },
      { date: '2026-04-05T00:00:00.000Z', flow: 'heavy', symptoms: ['bloating'] },
      { date: '2026-04-06T00:00:00.000Z', flow: 'medium', moodPrimary: 'tired' },
      { date: '2026-04-07T00:00:00.000Z', flow: 'light', energyLevel: 2 },
    ];

    for (const logData of logs) {
      await TrackerService.logDaily(userId, logData);
    }

    // 5. Trigger final recalculation for predictions
    console.log(`[Seed] Finalizing calculations...`);
    // TrackerService.logDaily already triggers handlePeriodStart and PredictionEngine.predict.
    // However, since we manually added history, let's explicitly update the current cycle start.
    
    // Check if Cycle 4 was created by handlePeriodStart on Apr 4th log
    const cycle4 = await (prisma as any).cycleRecord.findFirst({
      where: { userId, startDate: new Date('2026-04-04T00:00:00.000Z') }
    });
    
    if (cycle4) {
      console.log(`[Seed] Cycle 4 verified for April 4th start.`);
    } else {
      console.log(`[Seed] Manually creating Cycle 4...`);
      await (prisma as any).cycleRecord.create({
        data: {
          userId,
          cycleNumber: 4,
          startDate: new Date('2026-04-04T00:00:00.000Z'),
          periodStartDate: new Date('2026-04-04T00:00:00.000Z'),
          isComplete: false
        }
      });
    }

    console.log(`[Seed] Success! User ${phone} data has been reset and seeded.`);
  } catch (error) {
    console.error(`[Seed] Error during seeding:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
