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

router.get("/daily", QuestController.getDailyQuests);
router.post("/:id/accept", QuestController.acceptQuest);
router.get("/progress", QuestController.getProgress);
router.get("/badges", QuestController.getBadges);
router.post("/:id/complete-manual", QuestController.completeQuestManual);

export default router;
