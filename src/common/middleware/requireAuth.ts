import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "infano_access_secret_dev";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Authentication required.", 401));
  }
  const token = header.slice(7);
  try {
    const payload: any = jwt.verify(token, JWT_ACCESS_SECRET);
    (req as any).userId        = payload.sub;
    (req as any).contentTier  = payload.contentTier;
    (req as any).accountStatus = payload.accountStatus;
    next();
  } catch {
    next(new AppError("Invalid or expired access token.", 401));
  }
}
