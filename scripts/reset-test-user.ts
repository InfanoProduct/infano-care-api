import { prisma } from "../src/db/client.js";
import { redis } from "../src/db/redis.js";

async function safeDelete(name: string, fn: () => Promise<any>) {
  try {
    await fn();
  } catch (err: any) {
    console.warn(`[Skip/Warn] Could not delete ${name}:`, err.message);
  }
}

async function main() {
  const targetPhones = ["1234567891", "+911234567891", "911234567891"];
  console.log("==> Finding existing test user(s) with phones:", targetPhones);

  const existingUsers = await prisma.user.findMany({
    where: {
      phone: { in: targetPhones }
    },
    select: {
      id: true,
      phone: true,
      accountStatus: true,
      role: true,
    }
  });

  console.log(`Found ${existingUsers.length} user record(s) to remove.`);

  for (const u of existingUsers) {
    const userId = u.id;
    console.log(`Deleting all associated data for userId: ${userId} (${u.phone})...`);

    // 1. Tables without onDelete: Cascade (or many-to-one without cascade)
    await safeDelete("cycleLog", () => prisma.cycleLog.deleteMany({ where: { userId } }));
    await safeDelete("userDailyQuest", () => prisma.userDailyQuest.deleteMany({ where: { userId } }));
    await safeDelete("userBadge", () => prisma.userBadge.deleteMany({ where: { userId } }));
    await safeDelete("communityActivityLog", () => prisma.communityActivityLog.deleteMany({ where: { userId } }));
    await safeDelete("communityBookmark", () => prisma.communityBookmark.deleteMany({ where: { userId } }));
    await safeDelete("postReaction", () => prisma.postReaction.deleteMany({ where: { userId } }));
    await safeDelete("communityReply", () => prisma.communityReply.deleteMany({ where: { authorId: userId } }));
    await safeDelete("communityPost", () => prisma.communityPost.deleteMany({ where: { authorId: userId } }));
    await safeDelete("moderationAppeal", () => prisma.moderationAppeal.deleteMany({ where: { authorId: userId } }));
    await safeDelete("moderationLog", () => prisma.moderationLog.deleteMany({ where: { moderatorId: userId } }));
    await safeDelete("subscription", () => prisma.subscription.deleteMany({ where: { userId } }));

    // 2. Chat, Sessions, Appointments
    await safeDelete("chatMessage", () => prisma.chatMessage.deleteMany({ where: { session: { userId } } }));
    await safeDelete("chatSession", () => prisma.chatSession.deleteMany({ where: { userId } }));
    await safeDelete("expertChatMessage", () => prisma.expertChatMessage.deleteMany({ where: { senderId: userId } }));
    await safeDelete("expertChatSession", () => prisma.expertChatSession.deleteMany({ where: { OR: [{ userId }, { expertId: userId }] } }));
    await safeDelete("expertSessionSchedule", () => prisma.expertSessionSchedule.deleteMany({ where: { OR: [{ userId }, { expertId: userId }] } }));
    await safeDelete("peerLineMessage", () => prisma.peerLineMessage.deleteMany({ where: { session: { OR: [{ menteeId: userId }, { mentorId: userId }] } } }));
    await safeDelete("peerLineSession", () => prisma.peerLineSession.deleteMany({ where: { OR: [{ menteeId: userId }, { mentorId: userId }] } }));

    // 3. Courses, LMS, Programs, Orders
    await safeDelete("courseEnrollment", () => prisma.courseEnrollment.deleteMany({ where: { userId } }));
    await safeDelete("programEnrollment", () => prisma.programEnrollment.deleteMany({ where: { userId } }));
    await safeDelete("order", () => prisma.order.deleteMany({ where: { userId } }));
    await safeDelete("webinarRegistration", () => prisma.webinarRegistration.deleteMany({ where: { userId } }));

    // 4. Learners and sub-records
    const learners = await prisma.learnerProfile.findMany({ where: { parentId: userId }, select: { id: true } });
    const learnerIds = learners.map(l => l.id);
    if (learnerIds.length > 0) {
      await safeDelete("learnerLessonProgress", () => prisma.learnerLessonProgress.deleteMany({ where: { learnerId: { in: learnerIds } } }));
      await safeDelete("learnerActivityResult", () => prisma.learnerActivityResult.deleteMany({ where: { learnerId: { in: learnerIds } } }));
      await safeDelete("learnerCheckinAttempt", () => prisma.learnerCheckinAttempt.deleteMany({ where: { learnerId: { in: learnerIds } } }));
      await safeDelete("learnerBadgeAward", () => prisma.learnerBadgeAward.deleteMany({ where: { learnerId: { in: learnerIds } } }));
      await safeDelete("learnerPetalLedger", () => prisma.learnerPetalLedger.deleteMany({ where: { learnerId: { in: learnerIds } } }));
      await safeDelete("learnerJournalEntry", () => prisma.learnerJournalEntry.deleteMany({ where: { learnerId: { in: learnerIds } } }));
      await safeDelete("learnerProfile", () => prisma.learnerProfile.deleteMany({ where: { id: { in: learnerIds } } }));
    }

    // 5. Hard delete User (Cascade takes care of Profile, Avatar, CycleProfile, Streaks, Levels, Ledgers, etc.)
    await prisma.user.delete({ where: { id: userId } });
    console.log(`==> Successfully hard-deleted user ${userId} (${u.phone})!`);
  }

  // 6. Clean guest orders/webinars with the same phone
  await safeDelete("guest orders", () => prisma.order.deleteMany({ where: { guestPhone: { in: targetPhones } } }));
  await safeDelete("guest webinars", () => prisma.webinarRegistration.deleteMany({ where: { guestPhone: { in: targetPhones } } }));

  // 7. Clean Redis OTP keys
  try {
    for (const phone of targetPhones) {
      await redis.del(`otp:${phone}`);
      await redis.del(`otp:+91${phone.replace(/^\+91/, '')}`);
    }
  } catch (err) {
    console.warn("Redis cleanup skipped:", err);
  }

  // 8. Recreate fresh test user
  console.log("==> Creating fresh test user with phone +911234567891...");
  const newUser = await prisma.user.create({
    data: {
      phone: "+911234567891",
      isTestNumber: true,
      role: "PARENT",
      accountStatus: "PENDING_SETUP",
      onboardingStep: 0,
      onboardingCompletedAt: null,
      profile: {
        create: {
          displayName: "Parent",
          totalPoints: 0,
          totalCoins: 0,
        }
      }
    },
    include: {
      profile: true,
      learners: true,
      courseEnrollments: true,
    }
  });

  console.log("==> Test user recreated successfully!");
  console.log(JSON.stringify({
    id: newUser.id,
    phone: newUser.phone,
    isTestNumber: newUser.isTestNumber,
    accountStatus: newUser.accountStatus,
    onboardingStep: newUser.onboardingStep,
    learnersCount: newUser.learners.length,
    courseEnrollmentsCount: newUser.courseEnrollments.length,
    profileDisplayName: newUser.profile?.displayName,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    try {
      redis.disconnect();
    } catch { }
    process.exit(0);
  });
