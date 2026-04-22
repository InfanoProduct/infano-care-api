import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import fs from "fs";
import path from "path";

export class LearningService {
  static async listJourneys(ageBand?: string) {
    return prisma.learningJourney.findMany({
      where: {
        isActive: true,
        ...(ageBand ? { ageBand } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { episodes: true },
    });
  }

  static async getJourney(journeyId: string) {
    const journey = await prisma.learningJourney.findUnique({
      where: { id: journeyId },
      include: { episodes: { orderBy: { order: "asc" } } },
    });
    if (!journey) throw new AppError("Learning Journey not found", 404);
    return journey;
  }

  static async getEpisode(episodeId: string) {
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
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

    let totalAwardedPoints = 75; // Quest Link Base
    totalAwardedPoints += (data.knowledgeCheckAccuracy * 5);
    if (data.knowledgeCheckAccuracy === 3) totalAwardedPoints += 10;

    totalAwardedPoints += (data.reflectionMode === 'community' ? 15 : 10);
    if (data.isBingeBonus) totalAwardedPoints += 15;

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

    // Add points to profile
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: "User",
        totalPoints: totalAwardedPoints
      },
      update: {
        totalPoints: { increment: totalAwardedPoints }
      },
    });

    return { progress, pointsEarned: totalAwardedPoints };
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
