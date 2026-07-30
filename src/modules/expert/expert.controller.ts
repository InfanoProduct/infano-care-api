import { Request, Response } from "express";
import { ExpertService } from "./expert.service.js";
import { prisma } from "../../db/client.js";
import { redis } from "../../db/redis.js";
import { sendEmail } from "../../common/services/email.service.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export class ExpertController {
  static async getEnrollments(req: Request, res: Response) {
    try {
      const enrollments = await ExpertService.getEnrollments();
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCalendarSettings(req: Request, res: Response) {
    try {
      const expertId = (req as any).user?.id;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });
      const settings = await ExpertService.getCalendarSettings(expertId);
      res.json(settings || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateCalendarSettings(req: Request, res: Response) {
    try {
      const expertId = (req as any).user?.id;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });
      const settings = await ExpertService.updateCalendarSettings(expertId, req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getEnrollmentDetails(req: Request, res: Response) {
    try {
      const details = await ExpertService.getEnrollmentDetails(req.params.id as string);
      res.json(details);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const sessions = await ExpertService.getSessions(expertId);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async scheduleSession(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const session = await ExpertService.scheduleSession(expertId, req.body);
      res.status(201).json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async completeSession(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const session = await ExpertService.completeSession(expertId, req.params.id as string);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateSessionStatus(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: "status is required" });
      }

      const session = await ExpertService.updateSessionStatus(expertId, req.params.id as string, status);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateSessionMeetLink(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const { meetLink } = req.body;
      if (!meetLink || typeof meetLink !== 'string') {
        return res.status(400).json({ error: "meetLink is required" });
      }

      const session = await ExpertService.updateSessionMeetLink(expertId, req.params.id as string, meetLink);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async rescheduleSession(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const { scheduledAt } = req.body;
      if (!scheduledAt || typeof scheduledAt !== 'string') {
        return res.status(400).json({ error: "scheduledAt is required" });
      }

      const session = await ExpertService.rescheduleSession(expertId, req.params.id as string, scheduledAt);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async sendEmailOtp(req: Request, res: Response) {
    try {
      const expertId = (req as any).user?.id || (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const user = await prisma.user.findUnique({
        where: { id: expertId }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.email) {
        return res.status(400).json({ error: "No email address associated with this account" });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = crypto.createHash("sha256").update(otp).digest("hex");

      // Save to Redis (valid for 10 minutes)
      await redis.setex(`email-otp:${user.email}`, 600, hash);

      console.log(`[EMAIL OTP MOCK] Generated OTP ${otp} for email: ${user.email}`);

      // Send the email
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #6366f1; margin-bottom: 20px; font-weight: 700; text-align: center;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">Hello,</p>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">We received a request to reset your password. Use the following One-Time Password (OTP) to complete the verification:</p>
          <div style="font-size: 32px; font-weight: 800; background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 12px; letter-spacing: 6px; margin: 25px 0; color: #1e293b; border: 1px dashed #cbd5e1;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;">This OTP is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 30px 0;" />
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; text-align: center;">Best regards,<br/>Infano Care Team</p>
        </div>
      `;

      await sendEmail(user.email, "Infano Care - Password Reset Verification Code", html);

      res.json({ success: true, message: "OTP sent successfully to your email." });
    } catch (error: any) {
      console.error("Failed to send email OTP:", error);
      res.status(500).json({ error: error.message || "Failed to send email OTP" });
    }
  }

  static async verifyEmailOtpAndResetPassword(req: Request, res: Response) {
    try {
      const expertId = (req as any).user?.id || (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const { otp, newPassword } = req.body;
      if (!otp || !newPassword) {
        return res.status(400).json({ error: "OTP and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await prisma.user.findUnique({
        where: { id: expertId }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.email) {
        return res.status(400).json({ error: "No email address associated with this account" });
      }

      const cachedHash = await redis.get(`email-otp:${user.email}`);
      if (!cachedHash) {
        return res.status(400).json({ error: "OTP expired or not requested" });
      }

      const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
      if (inputHash !== cachedHash) {
        return res.status(400).json({ error: "Invalid OTP code" });
      }

      // Hash password and update User
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: expertId },
        data: {
          password: hashedPassword,
          accountStatus: "ACTIVE"
        }
      });

      // Clear the OTP from Redis
      await redis.del(`email-otp:${user.email}`);

      res.json({ success: true, message: "Password updated successfully." });
    } catch (error: any) {
      console.error("Failed to reset password via email OTP:", error);
      res.status(500).json({ error: error.message || "Failed to reset password" });
    }
  }
}
