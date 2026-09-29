import cron from "node-cron";
import { logger } from "../config/logger.js";
import { EtsySyncService } from "../modules/library/etsy.sync.js";

/**
 * Initializes the Etsy Background Sync Cron Job.
 * Runs every 5 minutes to fetch new Etsy sales (Physical & eBook),
 * save order records into the database, and dispatch Email #1 to buyers.
 */
export function initEtsyCronJobs() {
  logger.info("[EtsyCron] Initializing Etsy background order sync cron...");

  let isSyncing = false;

  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    if (isSyncing) return;
    isSyncing = true;

    try {
      logger.info("[EtsyCron] Running scheduled 5-minute Etsy orders sync...");
      const result = await EtsySyncService.syncRecentOrdersFromEtsy(48); // 48-hour window
      if (result && (result as any).synced > 0) {
        logger.info({ synced: (result as any).synced }, "[EtsyCron] Synced new Etsy orders successfully");
      }
    } catch (error: any) {
      logger.warn(`[EtsyCron] Background sync error: ${error?.message || error}`);
    } finally {
      isSyncing = false;
    }
  });
}
