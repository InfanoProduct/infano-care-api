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
        include: { profile: true, peerApplication: true },
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

  static async getBootstrap(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      if (!userId) throw new AppError("Unauthorized", 401);

      const [user, cycleProfile] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: { profile: true, peerApplication: true },
        }),
        prisma.cycleProfile.findUnique({
          where: { userId },
        }),
      ]);

      if (!user) throw new AppError("User not found", 404);

      // Fast Gigi Quote computation
      const quotes = [
        "Main character energy today, bestie! 💅✨ Your body is doing magic, keep shining!",
        "No cap, you are literally glowing today! Take it easy and slay ✨🌸",
        "Friendly reminder: You're that girl! Own your day with 100% confidence 💪🔥",
        "Big brain vibes only today! Never let anyone dim your sparkle 🧠✨",
        "It's giving unstoppable! Whatever you're working on, you've got this 🚀💖",
        "Self-care check: Hydrate, breathe, and remember you're iconic 💧👑",
        "Period or no period, you are an absolute force of nature! Slay today 🌸💫",
        "Serotonin boost activated! You are stronger and smarter than you know 🌟✨",
        "Era of body confidence unlocked! Every phase of you is beautiful 💖🏆",
        "Radiating main character confidence! Go conquer your goals today 💅🔥",
        "Soft girl aesthetic + strong mindset = unstoppable you! 🌸💪",
        "Manifesting good vibes, high energy, and pure joy for you today! ✨🌈",
        "No bad vibes allowed in your space today! Stay golden, bestie ⭐💖",
        "Your timeline, your pace! You're right where you're supposed to be 🌱✨"
      ];
      const startOfYear = new Date(new Date().getFullYear(), 0, 0);
      const diff = new Date().getTime() - startOfYear.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      const quoteIndex = dayOfYear % quotes.length;

      const { onboardingCompletedAt, ...userWithoutDate } = user;

      res.status(200).json({
        user: {
          ...userWithoutDate,
          onboardingCompletedAt,
          isOnboardingCompleted: onboardingCompletedAt !== null,
        },
        cycleProfile,
        quote: {
          quote: quotes[quoteIndex],
          date: new Date().toISOString().split("T")[0],
          author: "Gigi",
        },
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
      const { displayName, email, specialisation, consultationPrice, bio, dateOfBirth } = req.body;

      let birthMonth, birthYear;
      if (dateOfBirth) {
        const d = new Date(dateOfBirth);
        if (!isNaN(d.getTime())) {
          birthMonth = d.getMonth() + 1;
          birthYear = d.getFullYear();
        }
      }

      // Update User email and date of birth
      await prisma.user.update({
        where: { id: userId },
        data: { 
          email,
          ...(birthMonth !== undefined && { birthMonth }),
          ...(birthYear !== undefined && { birthYear })
        }
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
