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

router.post("/otp/send",    otpLimiter, AuthController.sendOtp);
router.post("/otp/verify",  otpLimiter, AuthController.verifyOtp);
router.post("/refresh",                AuthController.refresh);
router.post("/logout",                 AuthController.logout);

export default router;
