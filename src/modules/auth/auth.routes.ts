import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for development testing
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
router.post("/otp/send",    otpLimiter, AuthController.sendOtp);
router.post("/otp/verify",  otpLimiter, AuthController.verifyOtp);
router.post("/login",       AuthController.login);
router.post("/refresh",     AuthController.refresh);

router.post("/logout",                 AuthController.logout);

export default router;
