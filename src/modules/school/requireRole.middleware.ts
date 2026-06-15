import { Request, Response, NextFunction } from "express";
import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

/**
 * Enforces role-based access control against a list of allowed UserRole enums
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        return next(new AppError("Authentication required.", 401));
      }

      // Query database to fetch the exact role (highly secure, bypasses stale token state)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return next(new AppError("User account not found.", 401));
      }

      if (!allowedRoles.includes(user.role)) {
        return next(
          new AppError(
            `Forbidden: Access denied. Required role: ${allowedRoles.join(" or ")}. Your role is ${user.role}`,
            403
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
