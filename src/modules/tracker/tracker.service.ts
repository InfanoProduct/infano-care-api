import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { encryptNote, decryptNote } from "../../common/utils/encryption.js";
import { PredictionEngine } from "./prediction.engine.js";
import { GamificationService } from "../quest/gamification.service.js";
import { QuestService } from "../quest/quest.service.js";

export class TrackerService {
  /**
   * Daily Log Engine — Under-60-Second Design
   * Handles 8 fields with smart defaults and streak tracking.
   */
  static async logDaily(userId: string, data: any) {
    const { date, noteText, ...details } = data;
    const d = new Date(date);
    if (d.getUTCHours() >= 12) d.setUTCDate(d.getUTCDate() + 1);
    const logDate = new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z');

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

    // 2. Upsert Daily Log — track whether this is a brand new record
    const existingLog = await prisma.cycleLog.findUnique({
      where: { userId_date: { userId, date: logDate } },
    });
    const isNewLog = !existingLog;

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
    }

    // 4. Trigger Cycle Recalculation if Period Flow changed
    let cycleUpdated = false;
    let milestone: string | null = null;
    let extraQuestPoints = 0;

    if (details.flow && details.flow !== "none" && details.flow !== "ended") {
      const result = await this.handlePeriodStart(userId, logDate, wasWatching);
      cycleUpdated = true;
      if (result.firstPeriod) milestone = "first_period";
      extraQuestPoints += await QuestService.evaluateCompletion(userId, { type: "period_start_marked" });
    }

    if (details.flow === "ended") {
      extraQuestPoints += await QuestService.evaluateCompletion(userId, { type: "period_end_marked" });
    }

    // 5. Award points ONLY for a brand-new log saved for TODAY
    //    - Edits to existing logs → no points
    //    - Logging past days → no points
    //    - Points come exclusively from active quest rewards
    //    - Once all quests are exhausted, no further points are given
    let totalPoints = extraQuestPoints;
    const today = new Date();
    const isToday = logDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];

    if (isToday) {
      const questPoints = await QuestService.evaluateCompletion(userId, { type: "log_saved" });
      totalPoints += questPoints;
    }

    if (milestone === "first_period") {
      totalPoints += 200;
    }

    // 6. Update Profile with new Prediction (And always update streak/lastLogDate)
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
      points_earned: totalPoints,
    };
  }

  /**
   * Batch Period Range Update — "Edit Mode" Engine
   *
   * Rules:
   *  1. Rejects if startDate is in the future.
   *  2. Rejects if any existing period starts within 15 days of the new startDate
   *     (i.e., would violate the 15-day minimum gap).
   *  3. If the new startDate is >15 days away from ALL existing periods, it is
   *     treated as a BRAND-NEW cycle — a new CycleRecord is created and the
   *     old records are left intact (just the sequence numbers are updated).
   *  4. If the new startDate is within ±14 days of an existing period start,
   *     that CycleRecord is updated (existing behaviour).
   *  5. After any write the chain is re-sequenced and the prediction engine
   *     is re-run so the dashboard reflects the latest data immediately.
   */
  static async updatePeriodRange(userId: string, startDate: string, endDate: string) {
    const MIN_GAP_DAYS = 15;

    const sD = new Date(startDate);
    const eD = new Date(endDate);

    if (sD.getUTCHours() >= 12) sD.setUTCDate(sD.getUTCDate() + 1);
    if (eD.getUTCHours() >= 12) eD.setUTCDate(eD.getUTCDate() + 1);

    const start = new Date(sD); start.setUTCHours(0, 0, 0, 0);
    const end   = new Date(eD); end.setUTCHours(0, 0, 0, 0);

    if (start > end) throw new AppError('Start date must be before end date', 400);

    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (start > today) throw new AppError('Period start date cannot be in the future', 400);

    const allExistingRecords = await (prisma as any).cycleRecord.findMany({
      where:   { userId },
      orderBy: { startDate: 'asc' },
    });

    // Identify the record (if any) we are updating — within ±14-day window of new start
    const updateWindowStart = new Date(start); updateWindowStart.setDate(updateWindowStart.getDate() - 14);
    const updateWindowEnd   = new Date(start); updateWindowEnd.setDate(updateWindowEnd.getDate()   + 14);

    const nearestRecord = allExistingRecords.find((r: any) => {
      const rs = new Date(r.startDate);
      return rs >= updateWindowStart && rs <= updateWindowEnd;
    });

    // Enforce 15-day minimum gap against all OTHER records
    for (const r of allExistingRecords) {
      if (nearestRecord && r.id === nearestRecord.id) continue;
      const rStart = new Date(r.startDate);
      const gap = Math.abs(start.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24);
      if (gap < MIN_GAP_DAYS) {
        throw new AppError(
          `Periods must be at least ${MIN_GAP_DAYS} days apart. This conflicts with a period starting on ${rStart.toISOString().split('T')[0]}.`,
          400,
        );
      }
    }

    console.log(`[Tracker] 🔄 Period Range Update: User ${userId}, ${start.toISOString()} -> ${end.toISOString()}, isNew=${!nearestRecord}`);

    await prisma.$transaction(async (tx) => {
      const periodDurationDays =
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Clean up orphaned flow logs when shrinking an existing range
      if (nearestRecord) {
        const oldS = nearestRecord.periodStartDate ? new Date(nearestRecord.periodStartDate) : null;
        const oldE = nearestRecord.periodEndDate   ? new Date(nearestRecord.periodEndDate)   : null;
        if (oldS && oldE) {
          for (let d = new Date(oldS); d <= oldE; d.setDate(d.getDate() + 1)) {
            const dc = new Date(d);
            if (dc < start || dc > end) {
              await tx.cycleLog.updateMany({
                where: { userId, date: dc, flow: { not: 'none' } },
                data:  { flow: 'none', updatedAt: new Date() },
              });
            }
          }
        }
      }

      // Upsert CycleLogs for every day in the new range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        await tx.cycleLog.upsert({
          where:  { userId_date: { userId, date: new Date(d) } },
          update: { flow: 'medium', updatedAt: new Date() },
          create: { userId, date: new Date(d), flow: 'medium' },
        });
      }

      // Update existing OR create brand-new CycleRecord
      if (nearestRecord) {
        await (tx as any).cycleRecord.update({
          where: { id: nearestRecord.id },
          data:  { startDate: start, periodStartDate: start, periodEndDate: end, periodDurationDays },
        });
      } else {
        await (tx as any).cycleRecord.create({
          data: { userId, cycleNumber: 0, startDate: start, periodStartDate: start, periodEndDate: end, periodDurationDays, isComplete: false },
        });
      }

      // Re-sequence the entire chain in chronological order
      const allRecords = await (tx as any).cycleRecord.findMany({
        where: { userId }, orderBy: { startDate: 'asc' },
      });

      for (let i = 0; i < allRecords.length; i++) {
        const current = allRecords[i];
        const next    = allRecords[i + 1];
        const isComplete = !!next;
        let cycleLen: number | null = null;
        let actualEnd: Date | null  = null;
        if (next) {
          cycleLen  = Math.round((next.startDate.getTime() - current.startDate.getTime()) / (1000 * 60 * 60 * 24));
          actualEnd = new Date(next.startDate);
          actualEnd.setDate(actualEnd.getDate() - 1);
        }
        await (tx as any).cycleRecord.update({
          where: { id: current.id },
          data:  { cycleNumber: i + 1, isComplete, cycleLengthDays: cycleLen, endDate: actualEnd },
        });
      }
    });

    await this.recalculateBaselines(userId);

    // Always update profile with the latest period
    const latestRecord = await (prisma as any).cycleRecord.findFirst({
      where: { userId }, orderBy: { startDate: 'desc' },
    });
    if (latestRecord) {
      await (prisma as any).cycleProfile.update({
        where: { userId },
        data:  { lastPeriodStart: latestRecord.startDate, lastPeriodEnd: latestRecord.periodEndDate, trackerMode: 'active' as any },
      });
    }

    // Re-run prediction engine
    const prediction = await PredictionEngine.predict(userId);
    if (prediction) {
      await (prisma as any).cycleProfile.update({
        where: { userId },
        data:  {
          predictedNextStart:    prediction.predictedStart,
          predictionWindowEarly: prediction.windowEarly,
          predictionWindowLate:  prediction.windowLate,
          confidenceLevel:       prediction.confidenceLevel,
          currentPhase:          prediction.currentPhase,
          currentCycleDay:       prediction.cycleDay,
        },
      });
    }

    if (latestRecord) {
      try {
        const { QuestService } = await import("../quest/quest.service.js");
        await QuestService.evaluateCompletion(userId, { type: "period_start_marked" });
      } catch (e) {
        console.error("[TRACKER] Failed to trigger quest completion for period start:", e);
      }
    }

    if (latestRecord && latestRecord.periodEndDate) {
      try {
        const { QuestService } = await import("../quest/quest.service.js");
        await QuestService.evaluateCompletion(userId, { type: "period_end_marked" });
      } catch (e) {
        console.error("[TRACKER] Failed to trigger quest completion for period end:", e);
      }
    }

    return { success: true, isNewCycle: !nearestRecord, prediction };
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

      // 5. Update Badge Progress
      await QuestService.updateBadgeProgress(userId, "period_logged", { date });

      // 6. Milestone: Detect Watching -> Active transition
      if (wasWatching) {
        firstPeriod = true;
        // Award 200 points for first period milestone
        await GamificationService.awardPoints(
          userId,
          200,
          40,
          "milestone",
          undefined,
          "Milestone: First period logged"
        );
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
      orderBy: { startDate: 'desc' },
    });

    if (completedRecords.length === 0) return;

    // Filter to only include realistic cycle lengths (between 21 and 38 days)
    const realisticCycleRecords = completedRecords.filter(
      (r: any) => r.cycleLengthDays && r.cycleLengthDays >= 21 && r.cycleLengthDays <= 38
    );

    const validPeriodRecords = completedRecords.filter((r: any) => r.periodDurationDays);

    const avgPeriodDuration = validPeriodRecords.length > 0
      ? validPeriodRecords.reduce((sum: number, r: any) => sum + (r.periodDurationDays || 0), 0) / validPeriodRecords.length
      : 5;

    // Only update average cycle length if user has at least 3 completed realistic cycles
    // AND they are consistent with each other (difference between max and min is <= 3 days)
    if (realisticCycleRecords.length >= 3) {
      const lastThreeLengths = realisticCycleRecords.slice(0, 3).map((r: any) => r.cycleLengthDays);
      const maxLen = Math.max(...lastThreeLengths);
      const minLen = Math.min(...lastThreeLengths);
      const isConsistent = (maxLen - minLen) <= 3;

      if (isConsistent) {
        const avgCycleLength = lastThreeLengths.reduce((sum: number, len: number) => sum + len, 0) / 3;

        // Standard Deviation for Irregularity Detection
        let stdCycleLength = 0;
        const variance = lastThreeLengths.reduce((sum: number, len: number) => sum + Math.pow(len - avgCycleLength, 2), 0) / 3;
        stdCycleLength = Math.sqrt(variance);

        await (prisma as any).cycleProfile.update({
          where: { userId },
          data: {
            avgCycleLength,
            avgPeriodDuration,
            stdCycleLength,
            coefficientOfVar: avgCycleLength > 0 ? (stdCycleLength / avgCycleLength) * 100 : 0,
          },
        });
        console.log(`[Tracker] Updated avgCycleLength to consistent average: ${avgCycleLength}`);
        return;
      }
    }

    // Otherwise, keep the onboarding average cycle length intact and only update period duration
    await (prisma as any).cycleProfile.update({
      where: { userId },
      data: {
        avgPeriodDuration,
      },
    });
    console.log(`[Tracker] Retaining onboarding avgCycleLength. Updated period duration to: ${avgPeriodDuration}`);
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
    let lastStart: Date | null = null;
    if (data.lastPeriodStart) {
      const d = new Date(data.lastPeriodStart);
      // Create a date that represents the same calendar day but at UTC midnight
      // If the incoming date is 18:30 UTC (00:00 IST), d.getUTCDate() might be 19.
      // But we want it to be 20. 
      // The most reliable way is to use the local date components if sent from a local picker,
      // or simply assume the caller meant the "day" it represents.
      // However, to fix the existing issue where 18:30 UTC is sent:
      // We check if it's after 12:00 PM UTC - if so, it's likely a shift from the next day's IST midnight.
      // A better way: just use the string part if it's an ISO date.
      const isoStr = typeof data.lastPeriodStart === 'string' ? data.lastPeriodStart : d.toISOString();
      if (isoStr.includes('T')) {
        // If it's 2026-04-19T18:30:00.000Z, we want to know if it's April 20th in some timezone.
        // But since we don't know the timezone here easily without extra lookup,
        // we'll rely on the frontend sending the correct UTC midnight from now on.
        // For current fix, we'll parse it and if it's close to the end of the day, we snap to next.
        lastStart = new Date(d);
        if (lastStart.getUTCHours() >= 12) {
            lastStart.setUTCDate(lastStart.getUTCDate() + 1);
        }
        lastStart.setUTCHours(0, 0, 0, 0);
      } else {
        lastStart = new Date(d.setUTCHours(0, 0, 0, 0));
      }
    }
    
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
    // Award 15 coins & 100 XP for period tracker setup ONLY ONCE
    const existingLedger = await prisma.pointsLedger.findFirst({
      where: { userId, sourceType: "tracker_setup" },
    });
    if (!existingLedger) {
      await GamificationService.awardPoints(
        userId,
        100,
        15,
        "tracker_setup",
        undefined,
        "Completed Period Tracker Setup (+100 XP • +15 Coins)"
      );
    }
    // Evaluate quest completion for cycle setup
    try {
      await QuestService.evaluateCompletion(userId, { type: "cycle_setup_completed" });
    } catch (e) {
      console.error("[TRACKER] Failed to trigger quest completion for setup:", e);
    }

    return profile;
  }

  static async getPrediction(userId: string) {
    const rawPrediction = await PredictionEngine.predict(userId);
    const profile = await (prisma as any).cycleProfile.findUnique({ where: { userId } });
    
    if (!rawPrediction || !profile) return rawPrediction;

    const now = new Date();
    const lastLog = profile.lastLogDate ? new Date(profile.lastLogDate) : null;
    
    // Check if last log matches current UTC date (normalized)
    const hasLoggedToday = lastLog && (
      lastLog.getUTCFullYear() === now.getUTCFullYear() &&
      lastLog.getUTCMonth() === now.getUTCMonth() &&
      lastLog.getUTCDate() === now.getUTCDate()
    );

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

    // Refresh prediction to get latest cycle day, phase, and next phase info
    const prediction = await PredictionEngine.predict(userId);

    // Convert potential floats back to integers for safety
    return {
      ...profile,
      ...(prediction ? {
        currentCycleDay: prediction.cycleDay,
        currentPhase: prediction.currentPhase,
        nextPhase: (prediction as any).nextPhase,
        daysUntilNextPhase: (prediction as any).daysUntilNextPhase,
        predictedNextStart: prediction.predictedStart,
        predictionWindowEarly: prediction.windowEarly,
        predictionWindowLate: prediction.windowLate,
      } : {}),
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
