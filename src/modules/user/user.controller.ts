import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service.js";
import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

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
}
