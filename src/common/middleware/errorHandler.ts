import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../../config/logger.js";
import fs from "fs";
import path from "path";

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
  try {
    const logPath = path.join(process.cwd(), "server-errors.log");
    fs.appendFileSync(logPath, `${new Date().toISOString()} - ERROR: ${err.message}\n${err.stack}\n\n`);
  } catch (e) {
    // ignore
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ 
      error: err.message,
      details: (err as any).details 
    });
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

  const statusCode = err.statusCode || 500;
  let message = err.message || "An unexpected error occurred";

  // Handle Prisma Known Request Errors specifically
  if (err.code && typeof err.code === "string") {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : (typeof err.meta?.target === "string" ? err.meta.target : "value");
      return res.status(409).json({
        error: `A record with this ${target} already exists. Please choose a different ${target}.`,
        details: err.meta,
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        error: (err.meta?.cause as string) || "Record not found",
        details: err.meta,
      });
    }

    if (err.code === "P2003") {
      return res.status(400).json({
        error: "Related record not found or foreign key constraint failed.",
        details: err.meta,
      });
    }

    if (err.code.startsWith("P10") || err.code === "P2024") {
      return res.status(503).json({
        error: "Database is temporarily unreachable. Please try again in a few moments.",
      });
    }
  }

  // Mask database connection errors
  const lowerMsg = (message || "").toLowerCase();
  const isDbConnectionError = 
    lowerMsg.includes("connection closed") || 
    lowerMsg.includes("closed the connection") || 
    lowerMsg.includes("can't reach database") ||
    lowerMsg.includes("connect econnrefused") ||
    lowerMsg.includes("connection pool timeout") ||
    lowerMsg.includes("unreachable");

  if (isDbConnectionError) {
    message = "Database is temporarily unreachable. Please try again in a few moments.";
  } else if (process.env.NODE_ENV === "production") {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({ 
    error: message,
    details: err.details
  });
};
