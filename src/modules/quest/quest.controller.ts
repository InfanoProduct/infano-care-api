import { Request, Response } from "express";
import { QuestService } from "./quest.service.js";
import { GamificationService } from "./gamification.service.js";

export class QuestController {
  static async getDailyQuests(req: Request, res: Response) {
    const userId = (req as any).user.id;
    console.log(`[QUEST] Fetching daily quests for user: ${userId}`);
    const quests = await QuestService.generateDailyPool(userId);
    console.log(`[QUEST] Found ${quests.length} quests for user ${userId}`);
    res.json({ success: true, data: quests });
  }

  static async acceptQuest(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string') throw new Error("Quest ID is required and must be a string");
    console.log(`[QUEST] User ${userId} attempting to accept quest ${id}`);
    try {
      const quest = await QuestService.acceptQuest(userId, id);
      console.log(`[QUEST] Successfully accepted quest ${id}`);
      res.json({ success: true, data: quest });
    } catch (error: any) {
      console.error(`[QUEST] Failed to accept quest ${id}: ${error.message}`);
      throw error;
    }
  }

  static async getProgress(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const progress = await GamificationService.getUserProgress(userId);
    res.json({ success: true, data: progress });
  }

  static async getBadges(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const earned = await QuestService.getMyBadges(userId);
    const all = await QuestService.getAllBadges();
    
    // Map earned badges to include status
    const earnedIds = new Set(earned.map(b => b.badgeId));
    const badgeGallery = all.map(b => ({
      ...b,
      isEarned: earnedIds.has(b.id),
      awardedAt: earned.find(eb => eb.badgeId === b.id)?.awardedAt,
    }));

    res.json({ success: true, data: badgeGallery });
  }

  // Debug/Test endpoint to manually complete a quest
  static async completeQuestManual(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string') throw new Error("Quest ID is required and must be a string");
    await QuestService.completeQuest(userId, id);
    res.json({ success: true, message: "Quest completed manually" });
  }
}
