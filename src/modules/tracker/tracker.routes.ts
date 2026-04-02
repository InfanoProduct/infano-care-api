import { Router } from "express";
import { TrackerController } from "./tracker.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { dailyLogSchema } from "./tracker.schema.js";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * tags:
 *   name: Cycle Tracker
 *   description: AI-Powered Period and Cycle Tracking
 */

/**
 * @openapi
 * /api/tracker/setup:
 *   post:
 *     summary: Onboard user into the period tracker
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackerMode, lastPeriodStart]
 *             properties:
 *               trackerMode: { type: string, enum: [active, watching_waiting, trying_to_conceive] }
 *               lastPeriodStart: { type: string, format: date-time }
 *               avgCycleLength: { type: number, default: 28 }
 *               avgPeriodLength: { type: number, default: 5 }
 *               federatedLearningConsent: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Profile created successfully
 */
router.post("/setup",      TrackerController.setup);
router.get("/profile",      TrackerController.getProfile);


/**
 * @openapi
 * /api/tracker/log:
 *   post:
 *     summary: Log daily symptoms, flow, and mood
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date]
 *             properties:
 *               date: { type: string, format: date-time }
 *               flow: { type: string, enum: [none, light, medium, heavy, spotting, ended] }
 *               symptoms: { type: array, items: { type: string } }
 *               mood: { type: string }
 *               energy: { type: number, minimum: 1, maximum: 5 }
 *               sleepDuration: { type: number }
 *               noteText: { type: string }
 *               stressLevel: { type: number }
 *     responses:
 *       200:
 *         description: Log recorded successfully
 */
router.post("/log",        TrackerController.logDaily);

/**
 * @openapi
 * /api/tracker/logs:
 *   get:
 *     summary: Retrieve daily logs for a user
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: List of daily logs with decrypted notes
 */
router.get("/logs",        TrackerController.getLogs);

/**
 * @openapi
 * /api/tracker/prediction:
 *   get:
 *     summary: Get AI cycle prediction
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cycle prediction results
 */
router.get("/prediction",  TrackerController.getPrediction);

/**
 * @openapi
 * /api/tracker/insights:
 *   get:
 *     summary: Get cycle insights and symptom frequency
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated insights
 */
router.get("/insights",    TrackerController.getInsights);

/**
 * @openapi
 * /api/tracker/report:
 *   get:
 *     summary: Get doctor-ready cycle summary (Bloom Pro)
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clinical summary for last 3 months
 */
router.get("/report",      TrackerController.getDoctorSummary);

/**
 * @openapi
 * /api/tracker/notification-preferences:
 *   get:
 *     summary: Get user notification preferences for the tracker
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 *   put:
 *     summary: Update notification preferences
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 */
router.get("/notification-preferences", TrackerController.getNotificationPreferences);
router.put("/notification-preferences", TrackerController.updateNotificationPreferences);

/**
 * @openapi
 * /api/tracker/data/export:
 *   post:
 *     summary: Export all health tracker data (GDPR)
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 */
router.post("/data/export", TrackerController.exportData);

/**
 * @openapi
 * /api/tracker/data/all:
 *   delete:
 *     summary: Hard delete all health tracker data
 *     tags: [Cycle Tracker]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/data/all", TrackerController.deleteAllData);

export default router;
