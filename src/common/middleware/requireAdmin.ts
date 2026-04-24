import { Request, Response, NextFunction } from "express";
import { prisma } from "../../db/client.js";
import { AppError } from "./errorHandler.js";

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    
    if (!userId) {
      return next(new AppError("Authentication required.", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return next(new AppError("Forbidden: Admin access required.", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
}
