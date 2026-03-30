import { Router } from "express";
import { LearningController } from "./learning.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   name: Learning
 *   description: Educational content and journeys
 */

/**
 * @openapi
 * /api/learning/journeys:
 *   get:
 *     summary: List all available learning journeys
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of journeys
 */
router.get("/journeys", LearningController.listJourneys);

/**
 * @openapi
 * /api/learning/journeys/{id}:
 *   get:
 *     summary: Details of a single journey and its episodes
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Journey details
 */
router.get("/journeys/:id", LearningController.getJourney);

/**
 * @openapi
 * /api/learning/episodes/{id}:
 *   get:
 *     summary: Get details of a single episode
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Episode details
 */
router.get("/episodes/:id", LearningController.getEpisode);

/**
 * @openapi
 * /api/learning/episodes/{episodeId}/progress:
 *   post:
 *     summary: Update progress for an episode
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: episodeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               watchedSeconds: { type: number }
 *     responses:
 *       200:
 *         description: Progress updated
 */
router.post("/episodes/:episodeId/progress", LearningController.updateEpisodeProgress);

/**
 * @openapi
 * /api/learning/episodes/{episodeId}/complete:
 *   post:
 *     summary: Mark an episode as complete
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: episodeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Episode marked complete
 */
router.post("/episodes/:episodeId/complete", LearningController.completeEpisode);

/**
 * @openapi
 * /api/learning/episodes/{episodeId}/reflections:
 *   get:
 *     summary: Get community reflections for an episode
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: episodeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of reflections
 */
router.get("/episodes/:episodeId/reflections", LearningController.getCommunityReflections);

/**
 * @openapi
 * /api/learning/my-progress:
 *   get:
 *     summary: Get the user's overall learning progress
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress aggregate
 */
router.get("/my-progress", LearningController.getMyProgress);


export default router;
