import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = authHeader.split(" ")[1]!;
  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "infano_access_secret_dev";

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
    (req as any).user = { id: decoded.id };
    next();
  } catch (error) {
    next(new AppError("Invalid or expired token", 401));
  }
};
