import { Request, Response, NextFunction } from "express";
import { LearningService } from "./learning.service.js";

export class LearningController {
  static async listJourneys(req: Request, res: Response, next: NextFunction) {
    try {
      const { ageBand } = req.query;
      const result = await LearningService.listJourneys(typeof ageBand === 'string' ? ageBand : undefined);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getJourney(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const result = await LearningService.getJourney(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async completeSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const summaryId = req.params['summaryId'] as string;
      const { completedItems, lastViewedItemId } = req.body;
      const result = await LearningService.completeSummary(userId, summaryId, completedItems, lastViewedItemId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMyProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await LearningService.getUserProgress(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
