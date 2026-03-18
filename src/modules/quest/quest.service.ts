import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class QuestService {
  static async listQuests(type?: string) {
    return prisma.quest.findMany({
      where: type ? { type } : undefined,
    });
  }

  static async completeQuest(userId: string, questId: string) {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new AppError("Quest not found", 404);

    const completion = await prisma.userQuest.create({
      data: { userId, questId },
    });

    // Add points up to user profile
    await prisma.profile.update({
      where: { userId },
      data: { totalPoints: { increment: quest.points } },
    });

    // Check for level up (simple logic: every 500 points = 1 level)
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (profile) {
      const newLevel = Math.floor(profile.totalPoints / 500) + 1;
      if (newLevel > profile.level) {
        await prisma.profile.update({
          where: { userId },
          data: { level: newLevel },
        });
      }
    }

    return completion;
  }

  static async getMyQuests(userId: string) {
    return prisma.userQuest.findMany({
      where: { userId },
      include: { quest: true },
    });
  }
}
