import cron from "node-cron";
import { logger } from "../config/logger.js";
import { TrackerNotificationService } from "../modules/tracker/tracker.notifications.js";

/**
 * Initializes all tracker-related background jobs.
 */
export function initTrackerJobs() {
  logger.info("Initializing Tracker background jobs...");

  // 1. Daily Evaluation (4:00 AM)
  // Evaluates predictions, late periods, and phase changes.
  cron.schedule("0 4 * * *", async () => {
    logger.info("Running daily tracker notification evaluation...");
    try {
      await TrackerNotificationService.evaluateDailyNotifications();
    } catch (error) {
      logger.error({ err: error }, "Failed to run daily tracker notifications");
    }
  });

  // 2. Evening Log Reminder (8:00 PM)
  // Sends a gentle nudge if the user hasn't logged today.
  cron.schedule("0 20 * * *", async () => {
    logger.info("Running evening log reminder check...");
    try {
      await TrackerNotificationService.checkDailyLogReminders();
    } catch (error) {
      logger.error({ err: error }, "Failed to run log reminders");
    }
  });
}
