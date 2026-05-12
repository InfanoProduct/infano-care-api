import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { GamificationService } from "./gamification.service.js";

export class QuestService {
  /**
   * Generates a personalized daily quest pool for the user.
   * Based on cycle phase, level, and category distribution.
   */
  static async generateDailyPool(userId: string) {
    // 1. Check if user already has quests for today (using a 24h window to handle timezones)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingQuests = await prisma.userDailyQuest.findMany({
      where: { 
        userId, 
        questDate: {
          gte: new Date(startOfDay.getTime() - 12 * 60 * 60 * 1000), // Buffer for previous day/timezone
          lte: endOfDay
        }
      },
      include: { questTemplate: true },
    });

    if (existingQuests.length > 0) {
      // Filter for the most recent ones if multiple days found
      return existingQuests.sort((a, b) => b.questDate.getTime() - a.questDate.getTime()).slice(0, 8);
    }

    // 2. Get user context (phase, level)
    const [cycleProfile, userLevel] = await Promise.all([
      prisma.cycleProfile.findUnique({ where: { userId } }),
      prisma.userLevel.findUnique({ where: { userId } }),
    ]);

    const phase = cycleProfile?.currentPhase || "waiting";
    const level = userLevel?.currentLevel || 1;
    const today = startOfDay; // Re-define today for creation logic

    console.log(`[QUEST_GEN] User ${userId} context: Phase=${phase}, Level=${level}`);

    // 3. Fetch all active daily quest templates
    const templates = await prisma.questTemplate.findMany({
      where: { 
        type: "daily",
        isActive: true,
        minLevel: { lte: level },
        OR: [
          { maxLevel: null },
          { maxLevel: { gte: level } },
        ]
      },
    });

    console.log(`[QUEST_GEN] Found ${templates.length} active matching templates`);

    if (templates.length === 0) {
      console.log(`[QUEST_GEN] ⚠️ NO ACTIVE TEMPLATES FOUND. Database might need seeding.`);
      return [];
    }

    // 4. Select quests based on category distribution and phase weights
    // Spec: 2 Tracker, 2 Learning, 2 Community, 1 Wellbeing, 1 Wildcard
    const categories = ["tracker", "learning", "community", "wellbeing", "wildcard"];
    const counts = { tracker: 2, learning: 2, community: 2, wellbeing: 1, wildcard: 1 };
    
    const selectedTemplates: any[] = [];

    for (const cat of categories) {
      const catTemplates = templates.filter(t => t.category === cat);
      console.log(`[QUEST_GEN] Category ${cat}: ${catTemplates.length} templates available`);
      
      if (catTemplates.length === 0) continue;

      // Sort by phase weights
      const weighted = catTemplates.sort((a, b) => {
        const weightA = (a.phaseWeights as any)[phase] || 1;
        const weightB = (b.phaseWeights as any)[phase] || 1;
        return weightB - weightA;
      });

      // Pick top N
      selectedTemplates.push(...weighted.slice(0, (counts as any)[cat]));
    }

    // Fallback: If we have templates but selection yielded nothing, just take any 5
    if (selectedTemplates.length === 0 && templates.length > 0) {
      console.log(`[QUEST_GEN] ⚠️ Category selection yielded nothing. Using first 5 templates as fallback.`);
      selectedTemplates.push(...templates.slice(0, 5));
    }

    console.log(`[QUEST_GEN] Final selection: ${selectedTemplates.length} templates. Saving...`);

    // 5. Save to userDailyQuests
    try {
      await Promise.all(
        selectedTemplates.map(template => 
          prisma.userDailyQuest.create({
            data: {
              userId,
              questTemplateId: template.id,
              questDate: today,
              status: "available",
            }
          })
        )
      );
    } catch (error: any) {
      // If we hit a unique constraint error (P2002), it means another request 
      // already generated the quests for today. We can safely ignore this 
      // and just proceed to fetch the existing ones.
      if (error.code !== 'P2002') {
        console.error("[QUEST] Error creating daily quests:", error);
        throw error;
      }
    }

    return prisma.userDailyQuest.findMany({
      where: { 
        userId, 
        questDate: {
          gte: new Date(startOfDay.getTime() - 12 * 60 * 60 * 1000),
          lte: endOfDay
        }
      },
      include: { questTemplate: true },
    });
  }

  static async acceptQuest(userId: string, userQuestId: string) {
    const quest = await prisma.userDailyQuest.findFirst({
      where: { id: userQuestId, userId }
    });

    if (!quest) throw new AppError("Quest not found", 404);
    if (quest.status !== "available") throw new AppError(`Quest is already ${quest.status}`, 400);

    return prisma.userDailyQuest.update({
      where: { id: userQuestId },
      data: { status: "accepted", acceptedAt: new Date() },
      include: { questTemplate: true },
    });
  }

  /**
   * Evaluates completion of active quests based on a domain event.
   */
  static async evaluateCompletion(userId: string, event: { type: string, count?: number }): Promise<number> {
    // 1. Find accepted quests for this user
    const activeQuests = await prisma.userDailyQuest.findMany({
      where: { userId, status: "accepted" },
      include: { questTemplate: true }
    });

    let totalQuestPoints = 0;
    for (const uq of activeQuests) {
      const condition = uq.questTemplate.completionCondition as any;
      if (condition.event === event.type) {
        // Simple completion logic for now: if event matches, complete it
        await this.completeQuest(userId, uq.id);
        totalQuestPoints += uq.questTemplate.pointsBase;
      }
    }
    return totalQuestPoints;
  }

  static async completeQuest(userId: string, userQuestId: string) {
    const uq = await prisma.userDailyQuest.findFirst({
      where: { id: userQuestId, userId },
      include: { questTemplate: true }
    });

    if (!uq || uq.status === "completed") return;

    // 1. Mark as completed
    await prisma.userDailyQuest.update({
      where: { id: userQuestId },
      data: { 
        status: "completed", 
        completedAt: new Date(),
        pointsAwarded: uq.questTemplate.pointsBase
      },
      include: { questTemplate: true },
    });

    // 2. Award points
    await GamificationService.awardPoints(
      userId,
      uq.questTemplate.pointsBase,
      "daily_quest",
      uq.id,
      `Completed quest: ${uq.questTemplate.title}`
    );

    // 3. Check for badge reward
    if (uq.questTemplate.badgeRewardId) {
      await this.awardBadge(userId, uq.questTemplate.badgeRewardId, uq.id);
    }
  }

  static async awardBadge(userId: string, badgeId: string, sourceQuestId?: string) {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } }
    });

    if (existing) return;

    try {
      return await prisma.userBadge.create({
        data: {
          userId,
          badgeId,
          sourceQuestId,
        }
      });
    } catch (error: any) {
      if (error.code !== 'P2002') throw error;
      return;
    }
  }

  static async getMyBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    });
  }

  static async getAllBadges() {
    return prisma.badge.findMany();
  }
}
