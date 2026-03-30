import { Router } from "express";
import { UserController } from "./user.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * tags:
 *   name: User
 *   description: User profile and account management
 */

/**
 * @openapi
 * /api/user/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
router.get("/me", UserController.getMe);

/**
 * @openapi
 * /api/user/onboarding-stage:
 *   patch:
 *     summary: Update the user's current onboarding stage
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [onboardingStage]
 *             properties:
 *               onboardingStage: { type: string }
 *     responses:
 *       200:
 *         description: Stage updated successfully
 */
router.patch("/onboarding-stage", UserController.updateOnboardingStage);

export default router;
