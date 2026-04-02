import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Too many OTP requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication and OTP management
 */

/**
 * @openapi
 * /api/auth/otp/send:
 *   post:
 *     summary: Request an OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully.
 *       400:
 *         description: Invalid phone number.
 */
router.post("/otp/send",    AuthController.sendOtp);

/**
 * @openapi
 * /api/auth/otp/verify:
 *   post:
 *     summary: Verify OTP and Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               otp:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Login successful.
 *       401:
 *         description: Invalid OTP.
 */
router.post("/otp/verify",  AuthController.verifyOtp);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed.
 */
router.post("/refresh",                AuthController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully.
 */
router.post("/logout",                 AuthController.logout);

export default router;
