import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service.js";
import { sendOtpSchema, verifyOtpSchema, registerSchema, refreshSchema, loginSchema } from "./auth.schema.js";

export class AuthController {
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = sendOtpSchema.parse(req.body);
      await AuthService.sendOtp(phone);
      res.status(200).json({ message: "OTP sent successfully." });
    } catch (e) { next(e); }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = verifyOtpSchema.parse(req.body);
      const result = await AuthService.verifyOtp(phone, otp);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await AuthService.register(data);
      res.status(201).json(result);
    } catch (e) { next(e); }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await AuthService.refresh(refreshToken);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      await AuthService.logout(refreshToken);
      res.status(200).json({ message: "Logged out." });
    } catch (e) { next(e); }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { tempToken } = loginSchema.parse(req.body);
      const result = await AuthService.login(tempToken);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async updateStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { stage } = req.body;
      const userId = (req as any).user.id;
      const result = await AuthService.updateOnboardingStage(userId, stage);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }
}
