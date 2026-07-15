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
    const { earned, progress } = await QuestService.getMyBadges(userId);
    const all = await QuestService.getAllBadges();
    
    // Map earned badges to include status + linked unlock quests + progress
    const earnedIds = new Set(earned.map(b => b.badgeId));
    const progressMap = new Map(progress.map(p => [p.badgeId, p]));

    const badgeGallery = all.map(b => {
      const earnedRecord = earned.find(eb => eb.badgeId === b.id);
      const progressRecord = progressMap.get(b.id);

      return {
        ...b,
        isEarned: earnedIds.has(b.id),
        awardedAt: earnedRecord?.awardedAt ?? null,
        sourceQuestId: earnedRecord?.sourceQuestId ?? null,
        progressPercentage: progressRecord?.progress ?? 0,
        currentStep: progressRecord?.currentStep ?? 0,
        totalSteps: progressRecord?.totalSteps ?? 0,
        // rewardForQuests is already included from getAllBadges()
      };
    });

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
