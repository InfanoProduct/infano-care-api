import { Router } from "express";
import { UserController } from "./user.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { upload } from "../../common/middleware/upload.js";

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
router.get("/bootstrap", UserController.getBootstrap);

/**
 * @openapi
 * /api/user/onboarding-step:
 *   patch:
 *     summary: Update the user's current onboarding step
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [step]
 *             properties:
 *               step: { type: integer }
 *     responses:
 *       200:
 *         description: Step updated successfully
 */
router.patch("/onboarding-step", UserController.updateOnboardingStep);

/**
 * @openapi
 * /api/user/register-fcm-token:
 *   post:
 *     summary: Register an FCM token for the current user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken: { type: string }
 *     responses:
 *       200:
 *         description: Token registered successfully
 */
router.post("/register-fcm-token", UserController.registerFcmToken);
router.patch("/role", UserController.updateRole);
router.put("/profile", UserController.updateProfile);
router.post("/profile/avatar", upload.single("file"), UserController.uploadAvatar);

export default router;
