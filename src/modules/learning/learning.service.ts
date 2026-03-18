import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class LearningService {
  static async listJourneys(ageBand?: string) {
    return prisma.learningJourney.findMany({
      where: ageBand ? { ageBand } : undefined,
      include: { episodes: { orderBy: { order: "asc" } } },
    });
  }

  static async getJourney(journeyId: string) {
    const journey = await prisma.learningJourney.findUnique({
      where: { id: journeyId },
      include: { episodes: { orderBy: { order: "asc" } } },
    });
    if (!journey) throw new AppError("Journey not found", 404);
    return journey;
  }

  static async completeEpisode(userId: string, episodeId: string) {
    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) throw new AppError("Episode not found", 404);

    const progress = await prisma.userProgress.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      update: { completed: true },
      create: { userId, episodeId, completed: true },
    });

    // Add points to profile
    await prisma.profile.update({
      where: { userId },
      data: { totalPoints: { increment: episode.points } },
    });

    return progress;
  }

  static async getUserProgress(userId: string) {
    return prisma.userProgress.findMany({
      where: { userId, completed: true },
      include: { episode: true },
    });
  }
}
