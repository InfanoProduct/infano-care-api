import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing quest and log data for testing...");

  // 1. Delete user daily quests
  const uq = await prisma.userDailyQuest.deleteMany({});
  console.log(`- Deleted ${uq.count} UserDailyQuests`);

  // 2. Delete points ledger
  const pl = await prisma.pointsLedger.deleteMany({});
  console.log(`- Deleted ${pl.count} PointsLedger entries`);

  // 3. Delete cycle logs
  const cl = await prisma.cycleLog.deleteMany({});
  console.log(`- Deleted ${cl.count} CycleLogs`);

  // 4. Delete user badges
  const ub = await prisma.userBadge.deleteMany({});
  console.log(`- Deleted ${ub.count} UserBadges`);

  // 5. Reset User levels
  const ul = await prisma.userLevel.updateMany({
    data: {
      pointsTotal: 0,
      currentLevel: 1,
      lastLevelUpAt: null,
    }
  });
  console.log(`- Reset ${ul.count} UserLevels`);

  // 6. Reset Profile points
  const up = await prisma.profile.updateMany({
    data: {
      totalPoints: 0,
      bloomLevel: 1,
    }
  });
  console.log(`- Reset ${up.count} Profiles`);

  // 7. Reset CycleProfile streaks
  const cp = await prisma.cycleProfile.updateMany({
    data: {
      currentLogStreak: 0,
      longestLogStreak: 0,
      lastLogDate: null,
    }
  });
  console.log(`- Reset ${cp.count} CycleProfile streaks`);

  // 8. Reset Streaks
  const us = await prisma.userStreak.updateMany({
    data: {
      logStreakCurrent: 0,
      logStreakLongest: 0,
    }
  });
  console.log(`- Reset ${us.count} UserStreaks`);

  console.log("✅ Data cleared successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
