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
    logDate.setUTCHours(0, 0, 0, 0);

    console.log(`[Tracker] Logging daily for User: ${userId}, Date: ${logDate.toISOString()}`);
    console.log(`[Tracker] Details: ${JSON.stringify(details, null, 2)}`);

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
    const wasWatching = profile?.trackerMode === "watching_waiting";

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

      // Award 30 points for daily logging
      await prisma.profile.update({
        where: { userId },
        data: { totalPoints: { increment: 30 } },
      });
    }

    // 4. Trigger Cycle Recalculation if Period Flow changed
    let cycleUpdated = false;
    let milestone: string | null = null;
    if (details.flow && details.flow !== "none" && details.flow !== "ended") {
      const result = await this.handlePeriodStart(userId, logDate, wasWatching);
      cycleUpdated = true;
      if (result.firstPeriod) milestone = "first_period";
    }

    // 5. Update Profile with new Prediction (And always update streak/lastLogDate)
    const prediction = await PredictionEngine.predict(userId);
    await (prisma as any).cycleProfile.update({
      where: { userId },
      data: {
        ...streakUpdate,
        ...(prediction ? {
          predictedNextStart: prediction.predictedStart,
          predictionWindowEarly: prediction.windowEarly,
          predictionWindowLate: prediction.windowLate,
          confidenceLevel: prediction.confidenceLevel,
          currentPhase: prediction.currentPhase,
          currentCycleDay: prediction.cycleDay,
        } : {}),
      },
    });

    return {
      log_id: log.id,
      streak_day: (streakUpdate as any).currentLogStreak || 1,
      cycle_updated: cycleUpdated,
      prediction: prediction,
      milestone: milestone,
      points_earned: milestone === "first_period" ? 230 : 30, // 30 (log) + 200 (milestone)
    };
  }

  /**
   * Batch Period Range Update — \"Edit Mode\" Engine
   * Marks a range of days as a period, updates CycleLogs, and modifies/creates CycleRecord.
   */
  static async updatePeriodRange(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    if (start > end) throw new AppError("Start date must be before end date", 400);

    console.log(`[Tracker] Updating period range for User: ${userId}, Range: ${start.toISOString()} to ${end.toISOString()}`);

    // 1. Manage CycleRecord (Find closest record in +/- 14 day window)
    const windowStart = new Date(start);
    windowStart.setDate(windowStart.getDate() - 14);
    const windowEnd = new Date(start);
    windowEnd.setDate(windowEnd.getDate() + 14);

    const existingRecord = await (prisma as any).cycleRecord.findFirst({
      where: {
        userId,
        startDate: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { startDate: "asc" },
    });

    let oldDays: Date[] = [];
    if (existingRecord && existingRecord.periodStartDate && existingRecord.periodEndDate) {
      const os = new Date(existingRecord.periodStartDate);
      const oe = new Date(existingRecord.periodEndDate);
      for (let d = new Date(os); d <= oe; d.setDate(d.getDate() + 1)) {
        oldDays.push(new Date(d));
      }
    }

    // 2. Identify transitions
    const newDays: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      newDays.push(new Date(d));
    }

    const newDaysStr = new Set(newDays.map(d => d.toISOString()));
    const orphanedDays = oldDays.filter(d => !newDaysStr.has(d.toISOString()));

    await prisma.$transaction([
      // A. Reclaim orphaned days
      ...orphanedDays.map((date) =>
        prisma.cycleLog.updateMany({
          where: { userId, date, flow: { not: "none" } },
          data: { flow: "none", updatedAt: new Date() },
        })
      ),
      // B. Update/Upsert new days (Medium flow if not already set to something meaningful)
      ...newDays.map((date) =>
        prisma.cycleLog.upsert({
          where: { userId_date: { userId, date } },
          update: { flow: "medium", updatedAt: new Date() },
          create: { userId, date, flow: "medium" },
        })
      )
    ]);

    // 3. Update/Create Record
    if (existingRecord) {
      await (prisma as any).cycleRecord.update({
        where: { id: existingRecord.id },
        data: {
          startDate: start, // Pivot the cycle to new start date
          periodStartDate: start,
          periodEndDate: end,
          periodDurationDays: Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        },
      });
    } else {
      const cycleCount = await (prisma as any).cycleRecord.count({ where: { userId } });
      await (prisma as any).cycleRecord.create({
        data: {
          userId,
          cycleNumber: cycleCount + 1,
          startDate: start,
          periodStartDate: start,
          periodEndDate: end,
          periodDurationDays: Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
          isComplete: false,
        },
      });
    }

    // 4. Update Profile Baseline
    await (prisma as any).cycleProfile.update({
      where: { userId },
      data: {
        lastPeriodStart: start,
        lastPeriodEnd: end,
        trackerMode: "active" as any,
      },
    });

    // 4. Recalculate Baselines (Auto-update profile from history)
    await this.recalculateBaselines(userId);

    // 5. Recalculate Predictions
    const prediction = await PredictionEngine.predict(userId);
    if (prediction) {
       await (prisma as any).cycleProfile.update({
        where: { userId },
        data: {
          predictedNextStart: prediction.predictedStart,
          predictionWindowEarly: prediction.windowEarly,
          predictionWindowLate: prediction.windowLate,
          confidenceLevel: prediction.confidenceLevel,
          currentPhase: prediction.currentPhase,
          currentCycleDay: prediction.cycleDay,
        },
      });
    }

    return { success: true, prediction };
  }

  /**
   * Internal logic to manage cycle transitions
   */
  private static async handlePeriodStart(userId: string, date: Date, wasWatching: boolean = false) {
    const profile = await prisma.cycleProfile.findUnique({ where: { userId } });
    if (!profile) return { firstPeriod: false };

    // If it's the first day of a new period (after at least 14 days)
    const lastStart = profile.lastPeriodStart ? new Date(profile.lastPeriodStart) : null;
    const diffDays = lastStart ? (date.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24) : 999;

    let firstPeriod = false;

    if (diffDays >= 14) {
      // 1. Close current cycle record
      if (lastStart) {
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() - 1);
        await (prisma as any).cycleRecord.updateMany({
          where: { userId, startDate: lastStart, isComplete: false },
          data: {
            endDate: endDate,
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

      // 4. Recalculate Baselines
      await this.recalculateBaselines(userId);

      // 5. Milestone: Detect Watching -> Active transition
      if (wasWatching) {
        firstPeriod = true;
        // Award 200 points for first period milestone
        await prisma.profile.update({
          where: { userId },
          data: { totalPoints: { increment: 200 } },
        });
      }
    }

    return { firstPeriod };
  }

  /**
   * Baseline Recalculation Engine
   * Derives average cycle length and period duration from historical records.
   */
  private static async recalculateBaselines(userId: string) {
    console.log(`[Tracker] Recalculating baselines for User: ${userId}`);
    
    const completedRecords = await (prisma as any).cycleRecord.findMany({
      where: { userId, isComplete: true },
    });

    if (completedRecords.length === 0) return;

    // Calculate Averages
    const totalCycleLength = completedRecords.reduce((sum: number, r: any) => sum + (r.cycleLengthDays || 0), 0);
    const validCycleCount = completedRecords.filter((r: any) => r.cycleLengthDays).length;
    
    const totalPeriodDuration = completedRecords.reduce((sum: number, r: any) => sum + (r.periodDurationDays || 0), 0);
    const validPeriodCount = completedRecords.filter((r: any) => r.periodDurationDays).length;

    const avgCycleLength = validCycleCount > 0 ? totalCycleLength / validCycleCount : 28;
    const avgPeriodDuration = validPeriodCount > 0 ? totalPeriodDuration / validPeriodCount : 5;

    // Standard Deviation for Irregularity Detection (Simple version)
    let stdCycleLength = 0;
    if (validCycleCount > 1) {
      const variance = completedRecords
        .filter((r: any) => r.cycleLengthDays)
        .reduce((sum: number, r: any) => sum + Math.pow(r.cycleLengthDays - avgCycleLength, 2), 0) / validCycleCount;
      stdCycleLength = Math.sqrt(variance);
    }

    await (prisma as any).cycleProfile.update({
      where: { userId },
      data: {
        avgCycleLength,
        avgPeriodDuration,
        stdCycleLength,
        coefficientOfVar: avgCycleLength > 0 ? (stdCycleLength / avgCycleLength) * 100 : 0,
      },
    });
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
        avgCycleLength: data.cycleLengthDays,
        avgPeriodDuration: data.periodLengthDays,
        lastPeriodStart: lastStart,
        federatedLearningConsent: data.federatedLearningConsent,
        setupCompletedAt: new Date(),
      },
      create: {
        userId,
        trackerMode: data.trackerMode,
        avgCycleLength: data.cycleLengthDays,
        avgPeriodDuration: data.periodLengthDays,
        lastPeriodStart: lastStart,
        federatedLearningConsent: data.federatedLearningConsent,
        setupCompletedAt: new Date(),
      },
    });

    // 3. Recalculate Predictions Immediately
    const prediction = await PredictionEngine.predict(userId);
    if (prediction) {
      await (prisma as any).cycleProfile.update({
        where: { userId },
        data: {
          predictedNextStart: prediction.predictedStart,
          predictionWindowEarly: prediction.windowEarly,
          predictionWindowLate: prediction.windowLate,
          confidenceLevel: prediction.confidenceLevel,
          currentPhase: prediction.currentPhase,
          currentCycleDay: prediction.cycleDay,
        },
      });
    }

    // Award Onboarding Points (existing logic)
    await prisma.profile.update({
      where: { userId },
      data: { totalPoints: { increment: 50 } },
    });

    return profile;
  }

  static async getPrediction(userId: string) {
    const rawPrediction = await PredictionEngine.predict(userId);
    const profile = await (prisma as any).cycleProfile.findUnique({ where: { userId } });
    
    if (!rawPrediction || !profile) return rawPrediction;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const lastLog = profile.lastLogDate ? new Date(profile.lastLogDate) : null;
    const hasLoggedToday = lastLog && lastLog.getTime() === today.getTime();

    return {
      ...rawPrediction,
      currentLogStreak: profile.currentLogStreak || 0,
      hasLoggedToday: !!hasLoggedToday,
    };
  }

  static async getHistory(userId: string) {
    return await prisma.cycleRecord.findMany({
      where: { userId, isComplete: true },
      orderBy: { startDate: "desc" },
      take: 6,
    });
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

  static async getNotificationPreferences(userId: string) {
    let prefs = await (prisma as any).notificationPreferences.findUnique({
      where: { userId }
    });

    if (!prefs) {
      prefs = await (prisma as any).notificationPreferences.create({
        data: { userId }
      });
    }

    return prefs;
  }

  static async updateNotificationPreferences(userId: string, data: any) {
    return await (prisma as any).notificationPreferences.upsert({
      where: { userId },
      update: { ...data },
      create: { userId, ...data }
    });
  }

  static async exportData(userId: string) {
    // PRD: "initiates async ZIP generation (5-10 min). Push notification when ready."
    // For this MVP, we simulate the async process and return a 202
    return {
      status: "generating",
      estimated_m: "5-10",
      message: "Data export initiated. You will receive a notification when your ZIP is ready via S3."
    };
  }

  static async deleteAllData(userId: string) {
    // Hard delete cascades. We will explicitly delete tracker related tables.
    await prisma.$transaction([
      (prisma as any).cycleLog.deleteMany({ where: { userId } }),
      (prisma as any).cycleRecord.deleteMany({ where: { userId } }),
      (prisma as any).cycleProfile.deleteMany({ where: { userId } }),
      (prisma as any).notificationPreferences.deleteMany({ where: { userId } })
    ]);
    return true;
  }
}
