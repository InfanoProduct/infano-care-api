const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resetUserData() {
  const targetPhone = "9742802062";
  
  console.log(`🔍 Searching for user with phone matching "${targetPhone}"...`);

  const user = await prisma.user.findFirst({
    where: {
      phone: {
        contains: targetPhone
      }
    },
    include: {
      userLevel: true,
      userStreak: true
    }
  });

  if (!user) {
    console.error(`❌ User with phone containing "${targetPhone}" not found!`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`✅ Found User: ID=${user.id}, Name=${user.name || user.displayName}, Phone=${user.phone}`);
  console.log(`📊 Current State:`, {
    userLevel: user.userLevel,
    userStreak: user.userStreak
  });

  console.log(`🧹 Clearing all points, coins, ledgers, quests, inventory, and badges for user...`);

  // 1. Delete PointsLedger records
  const deletedPointsLedger = await prisma.pointsLedger.deleteMany({
    where: { userId: user.id }
  });
  console.log(` - Deleted ${deletedPointsLedger.count} PointsLedger records.`);

  // 2. Delete CoinLedger records
  const deletedCoinLedger = await prisma.coinLedger.deleteMany({
    where: { userId: user.id }
  });
  console.log(` - Deleted ${deletedCoinLedger.count} CoinLedger records.`);

  // 3. Delete UserInventory records
  const deletedInventory = await prisma.userInventory.deleteMany({
    where: { userId: user.id }
  });
  console.log(` - Deleted ${deletedInventory.count} UserInventory records.`);

  // 4. Delete UserDailyQuest records
  const deletedQuests = await prisma.userDailyQuest.deleteMany({
    where: { userId: user.id }
  });
  console.log(` - Deleted ${deletedQuests.count} UserDailyQuest records.`);

  // 5. Delete UserWeeklyChallenge records
  const deletedWeeklyProgress = await prisma.userWeeklyChallenge.deleteMany({
    where: { userId: user.id }
  });
  console.log(` - Deleted ${deletedWeeklyProgress.count} UserWeeklyChallenge records.`);

  // 6. Delete UserBadge & UserBadgeProgress records
  const deletedUserBadges = await prisma.userBadge.deleteMany({
    where: { userId: user.id }
  });
  console.log(` - Deleted ${deletedUserBadges.count} UserBadge records.`);

  const deletedBadgeProgress = await prisma.userBadgeProgress.deleteMany({
    where: { userId: user.id }
  });
  console.log(` - Deleted ${deletedBadgeProgress.count} UserBadgeProgress records.`);

  // 7. Reset UserLevel
  const updatedUserLevel = await prisma.userLevel.upsert({
    where: { userId: user.id },
    update: {
      currentLevel: 1,
      pointsTotal: 0,
      coinsBalance: 0,
      coinsTotal: 0,
      lastLevelUpAt: null
    },
    create: {
      userId: user.id,
      currentLevel: 1,
      pointsTotal: 0,
      coinsBalance: 0,
      coinsTotal: 0
    }
  });
  console.log(` - Reset UserLevel:`, updatedUserLevel);

  // 8. Reset UserStreak if present
  if (user.userStreak) {
    await prisma.userStreak.update({
      where: { userId: user.id },
      data: {
        logStreakCurrent: 0,
        questStreakCurrent: 0,
        lastQuestCompletedDate: null
      }
    });
    console.log(` - Reset UserStreak to 0.`);
  }

  console.log(`🎉 SUCCESS: All points and coins data for user +91 ${targetPhone} have been completely cleared!`);
  await prisma.$disconnect();
}

resetUserData().catch(async (e) => {
  console.error("❌ Error resetting user data:", e);
  await prisma.$disconnect();
  process.exit(1);
});
