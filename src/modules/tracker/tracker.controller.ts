import { Request, Response, NextFunction } from "express";
import { TrackerService } from "./tracker.service.js";
import { z } from "zod";

const setupSchema = z.object({
  lastPeriodStart:       z.string().optional().nullable(),
  lastPeriodEnd:         z.string().optional().nullable(),
  periodLengthDays:      z.number().int().min(2).max(10).default(5),
  cycleLengthDays:       z.number().int().min(21).max(45).default(28),
  periodLengthEstimated: z.boolean().optional().default(false),
  cycleLengthEstimated:  z.boolean().optional().default(false),
});

export class TrackerController {
  static async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const data   = setupSchema.parse(req.body);
      const result = await TrackerService.setup(userId, data);
      res.status(201).json(result);
    } catch (e) { next(e); }
  }

  static async logDaily(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.logDaily(userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { startDate, endDate } = req.query;
      const result = await TrackerService.getLogs(userId, startDate as string, endDate as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPrediction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.getPrediction(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
