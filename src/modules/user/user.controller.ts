import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service.js";
import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { StorageService } from "../../common/utils/storage.js";

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (!user) throw new AppError("User not found", 404);

      const { onboardingCompletedAt, ...userWithoutDate } = user;
      res.status(200).json({
        ...userWithoutDate,
        onboardingCompletedAt,
        isOnboardingCompleted: onboardingCompletedAt !== null,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOnboardingStep(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      const { step } = req.body;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: step },
      });
      res.status(200).json({ success: true, onboardingStep: user.onboardingStep });
    } catch (error) {
      next(error);
    }
  }

  static async registerFcmToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      const { fcmToken } = req.body;
      const tokenValue = (fcmToken === null || fcmToken === undefined || fcmToken === '') ? null : fcmToken;

      if (tokenValue) {
        // Clear this token from any other users to prevent notification leak on shared devices
        await prisma.user.updateMany({
          where: {
            fcmToken: tokenValue,
            id: { not: userId }
          },
          data: { fcmToken: null }
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: tokenValue },
      });
      res.status(200).json({ success: true, message: tokenValue ? "FCM token registered successfully" : "FCM token unregistered successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      const { role } = req.body;
      if (!role || (role !== "TEEN" && role !== "PARENT" && role !== "PEER" && role !== "EXPERT")) {
        throw new AppError("Invalid role specified", 400);
      }

      // Enforce that a user/phone number can only have one role
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, accountStatus: true }
      });

      if (!existingUser) {
        throw new AppError("User not found", 404);
      }

      if (existingUser.accountStatus !== "PENDING_SETUP") {
        throw new AppError("Role cannot be changed after initial setup. A user/phone number can only have one role.", 400);
      }

      // Enforce status and step progression when a role is selected
      const updateData: any = { role };
      if (role === "PARENT") {
        updateData.accountStatus = "ACTIVE";
        updateData.onboardingStep = 5;
        updateData.onboardingCompletedAt = new Date();
      } else if (role === "TEEN") {
        updateData.onboardingStep = 2; // Step 1 (Role Selection) is complete
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
      res.status(200).json({ success: true, role: user.role });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      const userRole = (req as any).userRole;
      const { displayName, email, specialisation, consultationPrice, bio } = req.body;

      // Update User email
      await prisma.user.update({
        where: { id: userId },
        data: { email }
      });

      const isExpert = userRole === 'EXPERT';
      const profileData: any = {
        displayName: displayName || ""
      };

      if (isExpert) {
        if (specialisation !== undefined) profileData.specialisation = specialisation;
        if (consultationPrice !== undefined) {
          profileData.consultationPrice = consultationPrice ? parseFloat(consultationPrice) : null;
        }
        if (bio !== undefined) profileData.bio = bio;
      }

      // Update/Upsert Profile details
      const updatedProfile = await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileData
        },
        update: profileData
      });

      res.status(200).json({
        success: true,
        profile: updatedProfile,
        email
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: "Email address is already in use by another account." });
      }
      next(error);
    }
  }

  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      if (!req.file) {
        throw new AppError("No file uploaded", 400);
      }

      // Upload to local storage under 'avatars' folder
      const { url } = await StorageService.uploadFile(req.file.path, "avatars");

      // Update/Upsert Profile with the new avatarUrl
      const updatedProfile = await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          displayName: "",
          avatarUrl: url
        },
        update: {
          avatarUrl: url
        }
      });

      res.status(200).json({
        success: true,
        message: "Profile photo uploaded successfully",
        avatarUrl: url,
        profile: updatedProfile
      });
    } catch (error) {
      next(error);
    }
  }
}
