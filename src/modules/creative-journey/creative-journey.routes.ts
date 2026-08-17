import { Router } from "express";
import { CreativeJourneyController } from "./creative-journey.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

// Guest & Public endpoints
router.get("/journeys", CreativeJourneyController.listJourneys);
router.get("/journeys/:id", CreativeJourneyController.getJourney);
router.get("/episodes/:episodeId", CreativeJourneyController.getEpisode);
router.get("/episodes/:episodeId/node-order", CreativeJourneyController.getOrCreateNodeOrder);

// Authenticated endpoints
router.get("/episodes/:episodeId/progress", authenticate, CreativeJourneyController.getEpisodeProgress);
router.post("/episodes/:episodeId/nodes/:nodeId/progress", authenticate, CreativeJourneyController.updateNodeProgress);
router.get("/my-progress", authenticate, CreativeJourneyController.getMyProgress);
router.post("/episodes/:episodeId/nodes/:nodeId/gigi-entry", authenticate, CreativeJourneyController.saveGigiEntry);

export default router;
