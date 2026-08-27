import { prisma } from "../src/db/client.js";
import { redis } from "../src/db/redis.js";

async function clearUserData() {
  const targetPhones = [
    "+919742802063",
    "9742802063",
    "+91 9742802063",
    "919742802063",
    "09742802063"
  ];
  console.log("🧹 Starting full data and cache cleanup for user target phones:", targetPhones);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { in: targetPhones } },
        { username: { in: targetPhones } }
      ]
    }
  });

  if (users.length === 0) {
    console.log("ℹ️ No user found directly with given phone numbers in PostgreSQL User table.");
  } else {
    for (const user of users) {
      console.log(`🗑️ Deleting user ID: ${user.id} (${user.phone})...`);

      const userId = user.id;

      // Delete child records explicitly to ensure complete wipeout
      await prisma.cycleLog.deleteMany({ where: { userId } }).catch(e => console.log("cycleLog err:", e.message));
      await prisma.cycleRecord.deleteMany({ where: { userId } }).catch(e => console.log("cycleRecord err:", e.message));
      await prisma.cycleProfile.deleteMany({ where: { userId } }).catch(e => console.log("cycleProfile err:", e.message));
      await prisma.profile.deleteMany({ where: { userId } }).catch(e => console.log("profile err:", e.message));
      await prisma.personalizationProfile.deleteMany({ where: { userId } }).catch(e => console.log("personalization err:", e.message));
      await prisma.userAvatar.deleteMany({ where: { userId } }).catch(e => console.log("userAvatar err:", e.message));
      await prisma.consentRequest.deleteMany({ where: { userId } }).catch(e => console.log("consentRequest err:", e.message));
      await prisma.pointsLedger.deleteMany({ where: { userId } }).catch(e => console.log("pointsLedger err:", e.message));
      await prisma.coinLedger.deleteMany({ where: { userId } }).catch(e => console.log("coinLedger err:", e.message));
      await prisma.userStreak.deleteMany({ where: { userId } }).catch(e => console.log("userStreak err:", e.message));
      await prisma.userLevel.deleteMany({ where: { userId } }).catch(e => console.log("userLevel err:", e.message));
      await prisma.userInventory.deleteMany({ where: { userId } }).catch(e => console.log("userInventory err:", e.message));
      await prisma.userDailyQuest.deleteMany({ where: { userId } }).catch(e => console.log("userDailyQuest err:", e.message));
      await prisma.userWeeklyChallenge.deleteMany({ where: { userId } }).catch(e => console.log("userWeeklyChallenge err:", e.message));
      await prisma.userBadgeProgress.deleteMany({ where: { userId } }).catch(e => console.log("userBadgeProgress err:", e.message));
      await prisma.userBadge.deleteMany({ where: { userId } }).catch(e => console.log("userBadge err:", e.message));
      await prisma.subscription.deleteMany({ where: { userId } }).catch(e => console.log("subscription err:", e.message));
      await prisma.notificationPreferences.deleteMany({ where: { userId } }).catch(e => console.log("notificationPref err:", e.message));
      await prisma.notificationHistory.deleteMany({ where: { userId } }).catch(e => console.log("notificationHistory err:", e.message));
      await prisma.chatMessage.deleteMany({ where: { session: { userId } } }).catch(e => console.log("chatMessage err:", e.message));
      await prisma.chatSession.deleteMany({ where: { userId } }).catch(e => console.log("chatSession err:", e.message));
      await prisma.expertChatMessage.deleteMany({ where: { session: { userId } } }).catch(e => console.log("expertChatMessage err:", e.message));
      await prisma.expertChatSession.deleteMany({ where: { userId } }).catch(e => console.log("expertChatSession err:", e.message));
      await prisma.expertSessionSchedule.deleteMany({ where: { userId } }).catch(e => console.log("expertSessionSchedule err:", e.message));
      await prisma.escalationEvent.deleteMany({ where: { userId } }).catch(e => console.log("escalationEvent err:", e.message));
      await prisma.creativeNodeProgress.deleteMany({ where: { userId } }).catch(e => console.log("creativeNodeProgress err:", e.message));
      await prisma.creativeAskGigiEntry.deleteMany({ where: { userId } }).catch(e => console.log("creativeAskGigiEntry err:", e.message));
      await prisma.articleBookmark.deleteMany({ where: { userId } }).catch(e => console.log("articleBookmark err:", e.message));
      await prisma.communityBookmark.deleteMany({ where: { userId } }).catch(e => console.log("communityBookmark err:", e.message));
      await prisma.communityActivityLog.deleteMany({ where: { userId } }).catch(e => console.log("communityActivityLog err:", e.message));
      await prisma.postReaction.deleteMany({ where: { userId } }).catch(e => console.log("postReaction err:", e.message));
      await prisma.communityReply.deleteMany({ where: { authorId: userId } }).catch(e => console.log("communityReply err:", e.message));
      await prisma.communityPost.deleteMany({ where: { authorId: userId } }).catch(e => console.log("communityPost err:", e.message));
      await prisma.moderationAppeal.deleteMany({ where: { authorId: userId } }).catch(e => console.log("moderationAppeal err:", e.message));
      await prisma.parentLink.deleteMany({ where: { OR: [{ senderId: userId }, { receiverPhone: { in: targetPhones } }] } }).catch(e => console.log("parentLink err:", e.message));
      await prisma.peerApplication.deleteMany({ where: { userId } }).catch(e => console.log("peerApplication err:", e.message));

      // Finally delete the user record
      await prisma.user.delete({ where: { id: userId } });
      console.log(`✅ Successfully deleted user record ${userId} from database.`);

      // Also search and clean Redis refresh token keys pointing to this userId
      try {
        if (redis && typeof redis.keys === "function") {
          const rtKeys = await redis.keys("rt:*");
          for (const key of rtKeys) {
            const storedVal = await redis.get(key);
            if (storedVal === userId) {
              await redis.del(key);
              console.log(`🧹 Cleared Redis refresh token key: ${key}`);
            }
          }
        }
      } catch (e: any) {
        console.log("Redis RT scan/delete err:", e.message);
      }
    }
  }

  // Clear ParentLink by phone if unlinked
  await prisma.parentLink.deleteMany({
    where: { receiverPhone: { in: targetPhones } }
  }).catch(e => console.log("parentLink phone clean err:", e.message));

  // Clear Redis Cache for OTPs
  console.log("🧹 Clearing Redis cache keys for OTP...");
  for (const phone of targetPhones) {
    await redis.del(`otp:${phone}`).catch((e: any) => console.log("Redis otp del err:", e.message));
  }
  try {
    if (redis && typeof redis.keys === "function") {
      const otpKeys = await redis.keys("*9742802063*");
      for (const key of otpKeys) {
        await redis.del(key);
        console.log(`🧹 Deleted Redis matching key: ${key}`);
      }
    }
  } catch (e: any) {
    console.log("Redis key scan error:", e.message);
  }

  console.log("🎉 Cleanup complete!");
}

clearUserData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    if (redis && typeof redis.quit === "function") {
      await redis.quit().catch(() => {});
    }
    process.exit(0);
  });
