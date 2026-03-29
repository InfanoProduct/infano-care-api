import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../../config/logger.js";

export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err.name === "SyntaxError" && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON in request body" });
  }

  const message = process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message;
  res.status(500).json({ error: message });
};
