import { Request, Response, NextFunction } from "express";
import { QuestService } from "./quest.service.js";

export class QuestController {
  static async listQuests(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.query;
      const result = await QuestService.listQuests(typeof type === 'string' ? type : undefined);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async completeQuest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const questId = req.params['questId'] as string;
      const result = await QuestService.completeQuest(userId, questId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMyQuests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const result = await QuestService.getMyQuests(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
