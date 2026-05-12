import { prisma } from "../../db/client.js";

export class MindfulService {
  static async getActiveActivities() {
    return prisma.mindfulActivity.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getActivityById(id: string) {
    return prisma.mindfulActivity.findUnique({
      where: { id },
    });
  }

  static async completeActivity(userId: string, activityId: string) {
    // 1. Mark as completed by user (upsert to avoid duplicates)
    await prisma.userMindfulActivity.upsert({
      where: { userId_mindfulActivityId: { userId, mindfulActivityId: activityId } },
      update: { completedAt: new Date() },
      create: { userId, mindfulActivityId: activityId },
    });

    const activity = await prisma.mindfulActivity.findUnique({ where: { id: activityId } });
    if (!activity) return null;

    // 2. Trigger Quest Evaluation (Mindfulness quest)
    // We import QuestService dynamically to avoid circular dependencies
    const { QuestService } = await import("../quest/quest.service.js");
    const pointsAwarded = await QuestService.evaluateCompletion(userId, { type: "mindfulness_completed" });

    // 3. Award points if no quest was active (default points)
    let totalPoints = 0;
    if (pointsAwarded > 0) {
      totalPoints = pointsAwarded;
    } else {
      const { GamificationService } = await import("../quest/gamification.service.js");
      await GamificationService.awardPoints(
        userId,
        activity.points || 30,
        "mindfulness",
        activityId,
        `Completed Mindful Minute: ${activity.title}`
      );
      totalPoints = activity.points || 30;
    }

    return { success: true, pointsEarned: totalPoints };
  }

  // Admin methods
  static async createActivity(data: any) {
    return prisma.mindfulActivity.create({ data });
  }
}
