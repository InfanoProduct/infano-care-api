import { Response } from "express";
import { MindfulService } from "./mindful.service.js";
import { QuestService } from "../quest/quest.service.js";
import { logger } from "../../config/logger.js";

export class MindfulController {
  static async list(req: any, res: Response) {
    try {
      const activities = await MindfulService.getActiveActivities();
      res.json({ success: true, data: activities });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async complete(req: any, res: Response) {
    try {
      const { activityId } = req.body;
      const userId = req.user.id;
      const result = await MindfulService.completeActivity(userId, activityId);
      
      // Hook for gamification/quests
      QuestService.evaluateCompletion(userId, { type: 'mindfulness_completed' })
        .catch(err => logger.error({ err }, 'Quest evaluation failed for mindfulness_completed'));
        
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const activity = await MindfulService.createActivity(req.body);
      res.json({ success: true, data: activity });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}
