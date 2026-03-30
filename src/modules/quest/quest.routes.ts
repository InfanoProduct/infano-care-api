import { Router } from "express";
import { QuestController } from "./quest.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   name: Quests
 *   description: Gamified task and challenge system
 */

/**
 * @openapi
 * /api/quest:
 *   get:
 *     summary: List all active and available quests
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of quests
 */
router.get("/", QuestController.listQuests);

/**
 * @openapi
 * /api/quest/{questId}/complete:
 *   post:
 *     summary: Mark a quest as completed by the user
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quest completion recorded
 */
router.post("/:questId/complete", QuestController.completeQuest);

/**
 * @openapi
 * /api/quest/me:
 *   get:
 *     summary: Get my currently active and completed quests
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's quest status
 */
router.get("/me", QuestController.getMyQuests);

export default router;
