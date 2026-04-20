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

  static async getEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const result = await LearningService.getEpisode(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateEpisodeProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const episodeId = req.params['episodeId'] as string;
      const { completedItems, lastViewedItemId, history } = req.body;
      const result = await LearningService.updateEpisodeProgress(userId, episodeId, completedItems, lastViewedItemId, history);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async completeEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const episodeId = req.params['episodeId'] as string;
      const { knowledgeCheckAccuracy, reflectionMode, reflectionContent, voiceUrl, isBingeBonus } = req.body;
      const result = await LearningService.completeEpisode(userId, episodeId, {
        knowledgeCheckAccuracy,
        reflectionMode,
        reflectionContent,
        voiceUrl,
        isBingeBonus
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getCommunityReflections(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeId = req.params['episodeId'] as string;
      const result = await LearningService.getCommunityReflections(episodeId);
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
