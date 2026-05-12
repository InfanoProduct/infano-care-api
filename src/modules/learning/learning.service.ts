import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import fs from "fs";
import path from "path";
import { GamificationService } from "../quest/gamification.service.js";
import { QuestService } from "../quest/quest.service.js";

export class LearningService {
  static async listJourneys(ageBand?: string) {
    return prisma.learningJourney.findMany({
      where: {
        isActive: true,
        ...(ageBand ? { ageBand } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: { episodes: true },
    });
  }

  static async getJourney(identifier: string) {
    const journey = await prisma.learningJourney.findFirst({
      where: {
        OR: [
          { id: identifier },
          { slug: identifier }
        ]
      },
      include: { episodes: { orderBy: { order: "asc" } } },
    });
    if (!journey) throw new AppError("Learning Journey not found", 404);
    return journey;
  }

  static async getEpisode(identifier: string) {
    const episode = await prisma.episode.findFirst({
      where: {
        OR: [
          { id: identifier },
          { slug: identifier }
        ]
      },
    });
    if (!episode) throw new AppError("Episode not found", 404);
    return episode;
  }

  /**
   * Updates progress within an episode (e.g. segment navigation).
   */
  static async updateEpisodeProgress(userId: string, episodeId: string, completedItems: any[] = [], lastViewedItemId?: string, history?: any) {
    const progress = await prisma.userProgress.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      update: {
        completedItems,
        lastViewedItemId,
        history,
        updatedAt: new Date(),
      },
      create: {
        userId,
        episodeId,
        completedItems,
        lastViewedItemId,
        history
      },
    });
    return progress;
  }

  /**
   * Finalizes an episode and awards points based on the 5-segment rules.
   */
  static async completeEpisode(
    userId: string,
    episodeId: string,
    data: {
      knowledgeCheckAccuracy: number; // 0-3
      reflectionMode: string;
      reflectionContent?: string;
      voiceUrl?: string;
      isBingeBonus?: boolean;
    }
  ) {
    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) throw new AppError("Episode not found", 404);

    // Points Calculation:
    // 1. Base completion: +75 (Quest Link baseline)
    // 2. Knowledge Check Answers: +5 * accuracy (max 15)
    // 3. Knowledge Check Bonus: +10 (if 3/3)
    // 4. Reflection: +10 (private) or +15 (community)
    // 5. Binge Bonus: +15 if completed within 10s of arriving

    const totalAwardedPoints = episode.points || 75; // Standardized with database value or Quest Link Base

    const progress = await prisma.userProgress.update({
      where: { userId_episodeId: { userId, episodeId } },
      data: { completed: true },
    });

    // Save Reflection
    if (data.reflectionContent || data.voiceUrl) {
      await prisma.reflection.create({
        data: {
          userId,
          episodeId,
          content: data.reflectionContent,
          voiceUrl: data.voiceUrl,
          isPrivate: data.reflectionMode === 'private',
        }
      });
    }

    // Evaluate Quests first to see if this task is linked to a quest
    const questPoints = await QuestService.evaluateCompletion(userId, { type: "episode_completed" });

    let finalPoints = 0;
    if (questPoints > 0) {
      finalPoints = questPoints;
    } else {
      // Add points to profile only if no quest was completed for this task
      await GamificationService.awardPoints(
        userId,
        totalAwardedPoints,
        "episode",
        episodeId,
        `Completed episode: ${episode.title}`
      );
      finalPoints = totalAwardedPoints;
    }

    return { progress, pointsEarned: finalPoints };
  }

  static async getCommunityReflections(episodeId: string) {
    return prisma.reflection.findMany({
      where: { episodeId, isPrivate: false },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  static async getUserProgress(userId: string) {
    return prisma.userProgress.findMany({
      where: { userId },
      include: { episode: true },
    });
  }
}
