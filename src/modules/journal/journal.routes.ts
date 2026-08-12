import { Router } from "express";
import { JournalController } from "./journal.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   name: Journal
 *   description: Private creative daily journal module
 */

// ── Entries ────────────────────────────────────────────────────────────────────
router.post("/entries", JournalController.createEntry);
router.get("/entries", JournalController.listEntries);
router.get("/entries/:id", JournalController.getEntry);
router.post("/entries/:id/share", JournalController.shareToCommunity);
router.put("/entries/:id", JournalController.updateEntry);
router.delete("/entries/:id", JournalController.deleteEntry);

// ── Prompts ────────────────────────────────────────────────────────────────────
router.get("/prompts/daily", JournalController.getDailyPrompt);
router.get("/prompts/jar", JournalController.getRandomPrompt);
router.get("/prompts", JournalController.getAllPrompts);

// ── Gamification & Insights ────────────────────────────────────────────────────
router.get("/streak", JournalController.getStreak);
router.get("/mood-weather", JournalController.getMoodWeather);
router.get("/time-capsules", JournalController.getTimeCapsules);
router.get("/on-this-day", JournalController.getOnThisDay);

// ── Admin / Setup ──────────────────────────────────────────────────────────────
router.post("/seed-prompts", JournalController.seedPrompts);

export default router;
