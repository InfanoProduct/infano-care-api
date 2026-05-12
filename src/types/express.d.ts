import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
      userId?: string;
      userRole?: UserRole | string;
    }
  }
}

export {};
