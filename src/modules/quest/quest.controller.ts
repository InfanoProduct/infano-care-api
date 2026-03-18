import { Request, Response, NextFunction } from "express";
import { QuestService } from "./quest.service.js";

export class QuestController {
      const { type } = req.query;
      const result = await QuestService.listQuests(type as string | undefined);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async completeQuest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { questId } = req.params;
      const result = await QuestService.completeQuest(userId, questId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMyQuests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const result = await QuestService.getMyQuests(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
