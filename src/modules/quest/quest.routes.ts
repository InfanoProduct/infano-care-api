import { Router } from "express";
import { QuestController } from "./quest.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", QuestController.listQuests);
router.post("/:questId/complete", QuestController.completeQuest);
router.get("/me", QuestController.getMyQuests);

export default router;
