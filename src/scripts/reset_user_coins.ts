import { prisma } from "../db/client.js";

async function resetUserCoinsAndProgress() {
  const targetPhones = ["+91 9742802062", "+919742802062", "9742802062"];
  
  const user = await prisma.user.findFirst({
    where: {
      phone: { in: targetPhones },
    },
    include: { profile: true },
  });

  if (!user) {
    console.log("User not found with phone +91 9742802062. Listing recent users:");
    const users = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, phone: true, profile: { select: { displayName: true } } },
    });
    console.log(JSON.stringify(users, null, 2));
    process.exit(1);
  }

  console.log("Found user:", user.id, "Phone:", user.phone, "Name:", user.profile?.displayName);
  const userId = user.id;

  // 1. Reset Profile coins and points
  if (user.profile) {
    await prisma.profile.update({
      where: { userId },
      data: { totalCoins: 0, totalPoints: 0, bloomLevel: 1 },
    });
    console.log("✅ Profile totalCoins & totalPoints reset to 0");
  }

  // 2. Reset UserLevel
  await prisma.userLevel.upsert({
    where: { userId },
    update: { coinsTotal: 0, pointsTotal: 0, currentLevel: 1 },
    create: { userId, coinsTotal: 0, pointsTotal: 0, currentLevel: 1 },
  });
  console.log("✅ UserLevel coinsTotal & pointsTotal reset to 0");

  // 3. Delete CreativeNodeProgress
  const deletedNodeProgress = await prisma.creativeNodeProgress.deleteMany({
    where: { userId },
  });
  console.log("✅ Deleted CreativeNodeProgress count:", deletedNodeProgress.count);

  // 4. Delete CreativeAskGigiEntry
  const deletedGigiEntries = await prisma.creativeAskGigiEntry.deleteMany({
    where: { userId },
  });
  console.log("✅ Deleted CreativeAskGigiEntry count:", deletedGigiEntries.count);

  // 5. Delete PointsLedger
  const deletedLedger = await prisma.pointsLedger.deleteMany({
    where: { userId },
  });
  console.log("✅ Deleted PointsLedger count:", deletedLedger.count);

  // 6. Delete UserDailyQuest
  const deletedQuests = await prisma.userDailyQuest.deleteMany({
    where: { userId },
  });
  console.log("✅ Deleted UserDailyQuest count:", deletedQuests.count);

  // 7. Reset UserStreak
  await prisma.userStreak.upsert({
    where: { userId },
    update: { logStreakCurrent: 0, logStreakLongest: 0, questStreakCurrent: 0 },
    create: { userId, logStreakCurrent: 0, logStreakLongest: 0, questStreakCurrent: 0 },
  });
  console.log("✅ UserStreak reset to 0");

  console.log("🎉 Successfully reset all coins and journey progress for +91 9742802062!");
}

resetUserCoinsAndProgress()
  .catch((e) => {
    console.error("❌ Reset script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
