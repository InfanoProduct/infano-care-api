import { Router } from "express";
import { OnboardingController } from "./onboarding.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * tags:
 *   name: Onboarding
 *   description: User profile and personalization setup
 */

/**
 * @openapi
 * /api/onboarding/profile:
 *   post:
 *     summary: Basic profile setup
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, birthDate]
 *             properties:
 *               fullName: { type: string }
 *               birthDate: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.post("/profile",         OnboardingController.setupProfile);

/**
 * @openapi
 * /api/onboarding/personalization:
 *   post:
 *     summary: Save user goals and interests
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               goals: { type: array, items: { type: string } }
 *               interests: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Personalization saved
 */
router.post("/personalization", OnboardingController.savePersonalization);

/**
 * @openapi
 * /api/onboarding/avatar:
 *   post:
 *     summary: Select user avatar
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarId: { type: string }
 *     responses:
 *       200:
 *         description: Avatar saved
 */
router.post("/avatar",          OnboardingController.saveAvatar);

/**
 * @openapi
 * /api/onboarding/journey-name:
 *   post:
 *     summary: Give your journey a custom name
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               journeyName: { type: string }
 *     responses:
 *       200:
 *         description: Journey name saved
 */
router.post("/journey-name",    OnboardingController.saveJourneyName);

/**
 * @openapi
 * /api/onboarding/complete:
 *   post:
 *     summary: Finalize onboarding process
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding complete
 */
router.post("/complete",        OnboardingController.completeOnboarding);

export default router;
