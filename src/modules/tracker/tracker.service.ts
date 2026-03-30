import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { encryptNote, decryptNote } from "../../common/utils/encryption.js";
import { PredictionEngine } from "./prediction.engine.js";

export class TrackerService {
  /**
   * Daily Log Engine — Under-60-Second Design
   * Handles 8 fields with smart defaults and streak tracking.
   */
  static async logDaily(userId: string, data: any) {
    const { date, noteText, ...details } = data;
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    // 1. Handle Note Encryption (AES-256-GCM)
    let noteCiphertext: string | null = null;
    let noteIv: string | null = null;
    if (noteText) {
      const encrypted = encryptNote(noteText);
      noteCiphertext = encrypted.ciphertext;
      noteIv = encrypted.iv;
    }

    // 2. Upsert Daily Log
    const log = await prisma.cycleLog.upsert({
      where: { userId_date: { userId, date: logDate } },
      update: {
        ...details,
        noteCiphertext,
        noteIv,
        updatedAt: new Date(),
      },
      create: {
        userId,
        date: logDate,
        ...details,
        noteCiphertext,
        noteIv,
      },
    });

    // 3. Update Streak & Statistics
    const profile = await (prisma as any).cycleProfile.findUnique({ where: { userId } });
    let streakUpdate = {};
    if (profile) {
      const yesterday = new Date(logDate);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastLog = (profile as any).lastLogDate ? new Date((profile as any).lastLogDate) : null;
      let newStreak = 1;
      
      if (lastLog && lastLog.getTime() === yesterday.getTime()) {
        newStreak = (profile as any).currentLogStreak + 1;
      } else if (lastLog && lastLog.getTime() === logDate.getTime()) {
        newStreak = (profile as any).currentLogStreak; // Already logged today
      }

      streakUpdate = {
        currentLogStreak: newStreak,
        longestLogStreak: Math.max(newStreak, (profile as any).longestLogStreak),
        lastLogDate: logDate,
      };
    }

    // 4. Trigger Cycle Recalculation if Period Flow changed
    let cycleUpdated = false;
    if (details.flow && details.flow !== "none" && details.flow !== "ended") {
      await this.handlePeriodStart(userId, logDate);
      cycleUpdated = true;
    }

    // 5. Update Profile with new Prediction
    const prediction = await PredictionEngine.predict(userId);
    if (prediction) {
      await (prisma as any).cycleProfile.update({
        where: { userId },
        data: {
          ...streakUpdate,
          predictedNextStart: prediction.predictedStart,
          predictionWindowEarly: prediction.windowEarly,
          predictionWindowLate: prediction.windowLate,
          confidenceLevel: prediction.confidenceLevel,
          currentPhase: prediction.currentPhase,
          currentCycleDay: prediction.cycleDay,
        },
      });
    }

    return {
      log_id: log.id,
      streak_day: (streakUpdate as any).currentLogStreak || 1,
      cycle_updated: cycleUpdated,
      prediction: prediction,
    };
  }

  /**
   * Internal logic to manage cycle transitions
   */
  private static async handlePeriodStart(userId: string, date: Date) {
    const profile = await prisma.cycleProfile.findUnique({ where: { userId } });
    if (!profile) return;

    // If it's the first day of a new period (after at least 14 days)
    const lastStart = profile.lastPeriodStart ? new Date(profile.lastPeriodStart) : null;
    const diffDays = lastStart ? (date.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24) : 999;

    if (diffDays >= 14) {
      // 1. Close current cycle record
      if (lastStart) {
        await (prisma as any).cycleRecord.updateMany({
          where: { userId, startDate: lastStart, isComplete: false },
          data: {
            endDate: date,
            cycleLengthDays: Math.round(diffDays),
            isComplete: true,
          },
        });
      }

      // 2. Start new cycle record
      const cycleCount = await (prisma as any).cycleRecord.count({ where: { userId } });
      await (prisma as any).cycleRecord.create({
        data: {
          userId,
          cycleNumber: cycleCount + 1,
          startDate: date,
          periodStartDate: date,
        },
      });

      // 3. Update profile baseline
      await (prisma as any).cycleProfile.update({
        where: { userId },
        data: {
          lastPeriodStart: date,
          trackerMode: "active" as any,
        },
      });
    }
  }

  static async getLogs(userId: string, from?: string, to?: string) {
    const logs = await prisma.cycleLog.findMany({
      where: {
        userId,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      orderBy: { date: "asc" },
    });

    return logs.map((log: any) => ({
      ...log,
      noteText: log.noteCiphertext && log.noteIv ? decryptNote(log.noteCiphertext, log.noteIv) : null,
    }));
  }

  static async setup(userId: string, data: any) {
    const lastStart = data.lastPeriodStart ? new Date(data.lastPeriodStart) : new Date();
    
    const profile = await (prisma as any).cycleProfile.upsert({
      where: { userId },
      update: {
        trackerMode: data.trackerMode,
        avgCycleLength: data.avgCycleLength,
        avgPeriodDuration: data.avgPeriodLength,
        lastPeriodStart: lastStart,
        federatedLearningConsent: data.federatedLearningConsent,
        setupCompletedAt: new Date(),
      },
      create: {
        userId,
        trackerMode: data.trackerMode,
        avgCycleLength: data.avgCycleLength,
        avgPeriodDuration: data.avgPeriodLength,
        lastPeriodStart: lastStart,
        federatedLearningConsent: data.federatedLearningConsent,
        setupCompletedAt: new Date(),
      },
    });

    // Award Onboarding Points (existing logic)
    await prisma.profile.update({
      where: { userId },
      data: { totalPoints: { increment: 50 } },
    });

    return profile;
  }

  static async getPrediction(userId: string) {
    return await PredictionEngine.predict(userId);
  }

  static async getProfile(userId: string) {
    const profile = await (prisma as any).cycleProfile.findUnique({
      where: { userId },
    });

    if (!profile) return null;

    // Convert potential floats back to integers for safety (schema uses Float for avgCycleLength)
    return {
      ...profile,
      avgCycleLength: profile.avgCycleLength ? Math.round(profile.avgCycleLength) : 28,
      avgPeriodDuration: profile.avgPeriodDuration ? Math.round(profile.avgPeriodDuration) : 5,
    };
  }
}
