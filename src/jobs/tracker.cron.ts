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

  // 2. Log Reminder & Streak Alert Check (Every minute)
  // Evaluates if any user needs a Daily Log Reminder or Streak At Risk Alert right now in their local timezone.
  cron.schedule("*/1 * * * *", async () => {
    try {
      await TrackerNotificationService.checkDailyLogReminders();
      await TrackerNotificationService.checkStreakAtRiskAlerts();
      await TrackerNotificationService.checkDailyCycleInsights();
    } catch (error) {
      logger.error({ err: error }, "Failed to run log/streak reminders");
    }
  });
}
