import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service.js";
import { sendOtpSchema, verifyOtpSchema, refreshSchema, adminLoginSchema } from "./auth.schema.js";

export class AuthController {
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, appHash } = sendOtpSchema.parse(req.body);
      const result = await AuthService.sendOtp(phone, appHash);
      res.status(200).json({ 
        message: "OTP sent successfully.",
        ...result 
      });
    } catch (e) { next(e); }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = verifyOtpSchema.parse(req.body);
      const result = await AuthService.verifyOtp(phone, otp);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { tempToken } = req.body;
      const result = await AuthService.login(tempToken);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);
      const result = await AuthService.adminLogin(username, password);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }



  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await AuthService.refresh(refreshToken);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async checkUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ exists: false, message: "Phone required" });
      }
      const { normalizePhone } = await import("../../common/utils/phone.js");
      const { prisma } = await import("../../db/client.js");
      
      const finalPhone = normalizePhone(phone);
      const user = await prisma.user.findUnique({
        where: { phone: finalPhone },
        select: { id: true, role: true }
      });
      
      res.status(200).json({ exists: !!user, role: user?.role });
    } catch (e) { next(e); }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      await AuthService.logout(refreshToken);
      res.status(200).json({ message: "Logged out." });
    } catch (e) { next(e); }
  }
}
