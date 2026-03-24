import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class LearningService {
  static async listJourneys(ageBand?: string) {
    return prisma.learningJourney.findMany({
      where:
        ageBand
          ? {
              OR: [
                { ageBand },
                { ageBand: null }, // Fallback to journeys that don't enforce an ageBand
              ],
            }
          : undefined,
      include: { summaries: { orderBy: { order: "asc" } } },
    });
  }

  static async getJourney(journeyId: string) {
    const journey = await prisma.learningJourney.findUnique({
      where: { id: journeyId },
      include: { summaries: { orderBy: { order: "asc" } } },
    });
    if (!journey) throw new AppError("Journey not found", 404);
    return journey;
  }

  static async completeSummary(userId: string, summaryId: string, completedItems: any[] = [], lastViewedItemId?: string) {
    const summary = await prisma.summary.findUnique({ where: { id: summaryId } });
    if (!summary) throw new AppError("Summary not found", 404);

    const isFullyCompleted = true; // Assuming a summary is marked explicitly complete

    const progress = await prisma.userProgress.upsert({
      where: { userId_summaryId: { userId, summaryId } },
      update: { 
        completed: isFullyCompleted,
        completedItems,
        lastViewedItemId
      },
      create: { 
        userId, 
        summaryId, 
        completed: isFullyCompleted,
        completedItems,
        lastViewedItemId
      },
    });

    // Add points to profile
    if (isFullyCompleted) {
      await prisma.profile.upsert({
        where: { userId },
        create: { userId, displayName: "User", totalPoints: summary.points },
        update: { totalPoints: { increment: summary.points } },
      });
    }

    return progress;
  }

  static async getUserProgress(userId: string) {
    return prisma.userProgress.findMany({
      where: { userId, completed: true },
      include: { summary: true },
    });
  }
}
