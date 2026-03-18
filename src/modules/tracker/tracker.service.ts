import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class TrackerService {
  static async logDaily(userId: string, data: any) {
    const { date, ...details } = data;
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    const log = await prisma.cycleLog.upsert({
      where: {
        userId_date: {
          userId,
          date: logDate,
        },
      },
      update: details,
      create: {
        userId,
        date: logDate,
        ...details,
      },
    });

    return log;
  }

  static async getLogs(userId: string, startDate?: string, endDate?: string) {
    const logs = await prisma.cycleLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: { date: "asc" },
    });

    return logs;
  }

  static async getPrediction(userId: string) {
    // Layer 1: Statistical baseline
    // Simplified: Find average cycle length from last 3 cycles
    // For now, return a basic prediction if data exists
    const logs = await prisma.cycleLog.findMany({
      where: { userId, flow: { not: null, notIn: ["NOT_STARTED", "ENDED"] } },
      orderBy: { date: "desc" },
      take: 20,
    });

    if (logs.length < 5) {
      return { message: "More data needed for accurate prediction" };
    }

    // Very basic placeholder logic for prediction
    const lastPeriodStart = logs[0].date;
    const nextPredicted = new Date(lastPeriodStart);
    nextPredicted.setDate(nextPredicted.getDate() + 28); // Default 28 days

    return {
      lastPeriodStart,
      nextPredictedStart: nextPredicted,
      averageCycleLength: 28,
      confidence: "LOW",
    };
  }
}
