import cron from "node-cron";
import { prisma } from "../db/client.js";
import { logger } from "../config/logger.js";

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
}
