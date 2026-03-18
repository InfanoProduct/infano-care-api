import { Request, Response, NextFunction } from "express";
import { TrackerService } from "./tracker.service.js";

export class TrackerController {
  static async logDaily(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const result = await TrackerService.logDaily(userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { startDate, endDate } = req.query;
      const result = await TrackerService.getLogs(userId, startDate as string, endDate as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPrediction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const result = await TrackerService.getPrediction(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
