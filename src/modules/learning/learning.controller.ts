import { Request, Response, NextFunction } from "express";
import { LearningService } from "./learning.service.js";

export class LearningController {
  static async listJourneys(req: Request, res: Response, next: NextFunction) {
    try {
      const { ageBand } = req.query;
      const result = await LearningService.listJourneys(ageBand as string | undefined);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getJourney(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await LearningService.getJourney(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async completeEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { episodeId } = req.params;
      const result = await LearningService.completeEpisode(userId, episodeId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMyProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const result = await LearningService.getUserProgress(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
