import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/admin-token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return next(new AppError("Authentication required", 401));
  }

  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "infano_access_secret_dev";

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
    const userId = decoded.sub || decoded.id;
    (req as any).user = { id: userId };
    (req as any).userId = userId;
    (req as any).userRole = decoded.role || 'TEEN';
    next();
  } catch (error) {
    next(new AppError("Invalid or expired token", 401));
  }
};
