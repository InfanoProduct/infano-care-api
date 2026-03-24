import { Router } from "express";
import { LearningController } from "./learning.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/journeys", LearningController.listJourneys);
router.get("/journeys/:id", LearningController.getJourney);
router.get("/episodes/:id", LearningController.getEpisode);
router.post("/episodes/:episodeId/progress", LearningController.updateEpisodeProgress);
router.post("/episodes/:episodeId/complete", LearningController.completeEpisode);
router.get("/episodes/:episodeId/reflections", LearningController.getCommunityReflections);
router.get("/my-progress", LearningController.getMyProgress);


export default router;
