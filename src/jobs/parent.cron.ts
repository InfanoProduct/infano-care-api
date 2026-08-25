import cron from "node-cron";
import { prisma } from "../db/client.js";
import { logger } from "../config/logger.js";
import { FirebaseService } from "../common/services/firebase.service.js";

export function initParentJobs() {
  // Run every hour to check for invites older than 48 hours
  cron.schedule("0 * * * *", async () => {
    logger.info("[CRON] Running Parent Link Reminders job...");
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const pendingLinks = await prisma.parentLink.findMany({
        where: {
          status: "PENDING",
          createdAt: {
            lte: fortyEightHoursAgo
          },
          lastRemindedAt: null
        }
      });

      for (const link of pendingLinks) {
        // Here we would trigger the push notification or SMS
        // e.g., await NotificationService.send(...)
        logger.info(`[CRON] Sending reminder to ${link.receiverPhone} for invite from ${link.senderId}`);

        await prisma.parentLink.update({
          where: { id: link.id },
          data: { lastRemindedAt: new Date() }
        });
      }
    } catch (error) {
      logger.error({ err: error }, "[CRON] Error in Parent Link Reminders job");
    }
  });

  // Run every minute to check for expert sessions starting in 15 minutes
  cron.schedule("*/1 * * * *", async () => {
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
    } catch (error) {
      logger.error({ err: error }, "[CRON] Error in Expert Session 15-Minute Reminders job");
    }
  });

  // 3. Weekly Parent Digest (Sundays at 10:00 AM)
  cron.schedule("0 10 * * 0", async () => {
    logger.info("[CRON] Running Weekly Parent Digest job...");
    try {
      const parentLinks = await prisma.parentLink.findMany({
        where: { status: "LINKED" },
        include: {
          parent: true,
          teen: { include: { profile: true } }
        }
      });

      for (const link of parentLinks) {
        if (!link.parent || !link.parentId || !link.teen) continue;
        const teenName = link.teen.profile?.displayName || "your daughter";
        const title = `📊 Weekly Family Digest Ready`;
        const body = `Review ${teenName}'s weekly wellness milestones and 3 suggested conversation starters for this week 💙`;
        const deepLink = `infano://account/family`;

        await prisma.notificationHistory.create({
          data: {
            userId: link.parentId,
            type: "PARENT_WEEKLY_DIGEST",
            title,
            body,
            deepLink,
            payload: { teenId: link.teenId },
            sentAt: new Date()
          }
        });

        if (link.parent.fcmToken) {
          try {
            await FirebaseService.sendPushNotification(link.parent.fcmToken, {
              title,
              body,
              deepLink,
              data: { notificationType: "PARENT_WEEKLY_DIGEST", teenId: link.teenId || "" }
            });
          } catch (err) {
            logger.error({ err, parentId: link.parentId }, "Failed to send weekly digest push to parent");
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, "[CRON] Error in Weekly Parent Digest job");
    }
  });
}
