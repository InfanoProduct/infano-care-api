import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

// ─── Cycle prediction helpers ──────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function computeCurrentPhase(lastPeriodStart: Date, avgPeriodLength: number, avgCycleLength: number): string {
  const daysSinceLast = Math.floor((Date.now() - lastPeriodStart.getTime()) / 86400000);
  if (daysSinceLast < avgPeriodLength) return "menstrual";
  if (daysSinceLast < avgCycleLength * 0.45) return "follicular";
  if (daysSinceLast < avgCycleLength * 0.55) return "ovulation";
  return "luteal";
}

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
    const lastPeriodStart = logs[0]!.date;
    const nextPredicted = new Date(lastPeriodStart);
    nextPredicted.setDate(nextPredicted.getDate() + 28); // Default 28 days

    return {
      lastPeriodStart,
      nextPredictedStart: nextPredicted,
      averageCycleLength: 28,
      confidence: "LOW",
    };
  }

  // ── Setup (Stage 5 onboarding) ───────────────────────────────────────────────
  static async setup(userId: string, data: {
    lastPeriodStart?: string | null;
    lastPeriodEnd?:   string | null;
    periodLengthDays: number;
    cycleLengthDays:  number;
    periodLengthEstimated?: boolean;
    cycleLengthEstimated?:  boolean;
  }) {
    const lastStart = data.lastPeriodStart
      ? new Date(data.lastPeriodStart)
      : addDays(new Date(), -(data.cycleLengthDays / 2));  // statistical fallback

    const nextStart = addDays(lastStart, data.cycleLengthDays);
    const nextEnd   = addDays(nextStart, data.periodLengthDays - 1);

    const profile = await prisma.cycleProfile.upsert({
      where:  { userId },
      create: {
        userId,
        trackerMode:             "ACTIVE",
        lastPeriodStart:         lastStart,
        lastPeriodEnd:           data.lastPeriodEnd ? new Date(data.lastPeriodEnd) : undefined,
        avgPeriodLength:         data.periodLengthDays,
        avgCycleLength:          data.cycleLengthDays,
        periodLengthEstimated:   data.periodLengthEstimated ?? false,
        cycleLengthEstimated:    data.cycleLengthEstimated ?? false,
        nextPeriodPredictedStart: nextStart,
        nextPeriodPredictedEnd:   nextEnd,
        predictionConfidence:    "low",
        setupCompletedAt:        new Date(),
      },
      update: {
        lastPeriodStart:         lastStart,
        lastPeriodEnd:           data.lastPeriodEnd ? new Date(data.lastPeriodEnd) : undefined,
        avgPeriodLength:         data.periodLengthDays,
        avgCycleLength:          data.cycleLengthDays,
        periodLengthEstimated:   data.periodLengthEstimated ?? false,
        cycleLengthEstimated:    data.cycleLengthEstimated ?? false,
        nextPeriodPredictedStart: nextStart,
        nextPeriodPredictedEnd:   nextEnd,
        predictionConfidence:    "low",
        setupCompletedAt:        new Date(),
      },
    });

    // Award Stage 5 points
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: "User", totalPoints: 50 },
      update: { totalPoints: { increment: 50 } },
    });

    return {
      trackerId:            profile.id,
      nextPeriodPredicted:  { start: toISODate(nextStart), end: toISODate(nextEnd) },
      predictionConfidence: "low" as const,
      currentCycleDay:      Math.floor((Date.now() - lastStart.getTime()) / 86400000) + 1,
      currentPhase:         computeCurrentPhase(lastStart, data.periodLengthDays, data.cycleLengthDays),
    };
  }
}
