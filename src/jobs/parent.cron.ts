import cron from "node-cron";
import { prisma } from "../db/client.js";
import { logger } from "../config/logger.js";
import { FirebaseService } from "../common/services/firebase.service.js";

export function initParentJobs() {
  // Parent link reminders are deprecated as family link has been retired

  // Run every minute to check for expert sessions starting in 15 minutes
  let isCheckingExpertSessions = false;
  cron.schedule("*/1 * * * *", async () => {
    if (isCheckingExpertSessions) return;
    isCheckingExpertSessions = true;
    try {
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 16 * 60 * 1000); // 16 minutes max window to catch it

      const sessions = await prisma.expertSessionSchedule.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: {
            gte: now,
            lte: fifteenMinutesFromNow
          }
        },
        include: {
          expert: { include: { profile: true } },
          user: { include: { profile: true } }
        }
      });

      for (const session of sessions) {
        if (!session.userId || !session.user) continue;

        // 1. Notify user if not already notified
        const userAlreadyNotified = await prisma.notificationHistory.findFirst({
          where: {
            userId: session.userId,
            type: "sessionReminder15Min",
            payload: {
              path: ["sessionId"],
              equals: session.id
            }
          }
        });

        if (!userAlreadyNotified) {
          const expertName = session.expert.profile?.displayName || session.expert.username || "Expert";
          const title = "Session Starting Soon";
          const body = `Your session with ${expertName} starts in 15 minutes.`;
          const deepLink = `infano://expert/chat/${session.id}`;

          await prisma.notificationHistory.create({
            data: {
              userId: session.userId,
              type: "sessionReminder15Min",
              title,
              body,
              deepLink,
              payload: { sessionId: session.id }
            }
          });

          if (session.user.fcmToken) {
            try {
              await FirebaseService.sendPushNotification(session.user.fcmToken, {
                title,
                body,
                deepLink,
                data: { notificationType: "sessionReminder15Min", sessionId: session.id }
              });
            } catch (err) {
              logger.error({ err, sessionId: session.id }, "Failed to send push notification for 15 min reminder to user");
            }
          }
        }

        // 2. Notify expert if not already notified
        const expertAlreadyNotified = await prisma.notificationHistory.findFirst({
          where: {
            userId: session.expertId,
            type: "sessionReminder15Min",
            payload: {
              path: ["sessionId"],
              equals: session.id
            }
          }
        });

        if (!expertAlreadyNotified) {
          const userName = session.user.profile?.displayName || session.user.username || "User";
          const title = "Session Starting Soon";
          const body = `Your session with ${userName} starts in 15 minutes.`;
          const deepLink = `infano://expert/chat/${session.id}`;

          await prisma.notificationHistory.create({
            data: {
              userId: session.expertId,
              type: "sessionReminder15Min",
              title,
              body,
              deepLink,
              payload: { sessionId: session.id }
            }
          });

          if (session.expert.fcmToken) {
            try {
              await FirebaseService.sendPushNotification(session.expert.fcmToken, {
                title,
                body,
                deepLink,
                data: { notificationType: "sessionReminder15Min", sessionId: session.id }
              });
            } catch (err) {
              logger.error({ err, sessionId: session.id }, "Failed to send push notification for 15 min reminder to expert");
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn(`[ParentCron] Expert session check skipped/errored: ${error?.message || error}`);
    } finally {
      isCheckingExpertSessions = false;
    }
  });

  // 3. Weekly Parent Digest (Sundays at 10:00 AM)
  cron.schedule("0 10 * * 0", async () => {
    logger.info("[CRON] Running Weekly Parent Digest job...");
    try {
      const learners = await prisma.learnerProfile.findMany({
        include: {
          parent: { include: { profile: true } }
        }
      });

      for (const learner of learners) {
        if (!learner.parentId || !(learner as any).parent) continue;

        const parent = (learner as any).parent;
        const teenName = learner.name || "your daughter";
        const title = "📊 Weekly Learner Digest Ready";
        const body = `Review ${teenName}'s weekly wellness milestones and 3 suggested conversation starters for this week 💙`;
        const deepLink = "infano://dashboard";
        const type = "PARENT_WEEKLY_DIGEST";

        await prisma.notificationHistory.create({
          data: {
            userId: learner.parentId,
            type,
            title,
            body,
            deepLink,
            payload: { learnerId: learner.id },
            sentAt: new Date()
          }
        });

        if (parent.fcmToken) {
          try {
            await FirebaseService.sendPushNotification(parent.fcmToken, {
              title,
              body,
              deepLink,
              data: { notificationType: type, learnerId: learner.id }
            });
          } catch (err) {
            logger.error({ err, parentId: learner.parentId }, "Failed to send weekly digest push to parent");
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, "[CRON] Error in Weekly Parent Digest job");
    }
  });
}
