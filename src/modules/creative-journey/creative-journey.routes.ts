import { Router } from "express";
import { CreativeJourneyController } from "./creative-journey.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

// ── Public (guest-accessible) ─────────────────────────────────────────────────
router.get("/journeys", CreativeJourneyController.listJourneys);
router.get("/journeys/:id", CreativeJourneyController.getJourney);
router.get("/episodes/:episodeId", CreativeJourneyController.getEpisode);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authenticate);

// Node order (seeded shuffle — computed once, persisted)
router.get("/episodes/:episodeId/node-order", CreativeJourneyController.getNodeOrder);

// Episode progress (all nodes)
router.get("/episodes/:episodeId/progress", CreativeJourneyController.getEpisodeProgress);

// Update a single node's progress
router.post(
  "/episodes/:episodeId/nodes/:nodeId/progress",
  CreativeJourneyController.updateNodeProgress
);

// Ask Gigi entries (private journalling)
router.post(
  "/episodes/:episodeId/nodes/:nodeId/gigi-entry",
  CreativeJourneyController.saveGigiEntry
);

// Parent/guardian access to a linked user's Gigi entries
router.get(
  "/gigi-entries/user/:targetUserId",
  CreativeJourneyController.getGigiEntriesForUser
);

// Aggregate progress for the current user
router.get("/my-progress", CreativeJourneyController.getMyProgress);

// Reset episode progress for testing
router.post("/episodes/:episodeId/reset", CreativeJourneyController.resetEpisodeProgress);

export default router;
