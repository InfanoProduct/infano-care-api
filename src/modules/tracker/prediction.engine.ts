import { prisma } from "../../db/client.js";

export interface PredictionResult {
  predictedStart: Date;
  windowEarly: Date;
  windowLate: Date;
  ovulationDate: Date;
  fertilityStart: Date;
  fertilityEnd: Date;
  confidenceLevel: "none" | "getting_started" | "building" | "confident" | "high" | "irregular";
  daysUntilPrediction: number;
  currentPhase: "menstrual" | "follicular" | "ovulation" | "luteal" | "waiting" | "delayed";
  nextPhase: "menstrual" | "follicular" | "ovulation" | "luteal" | "waiting" | "delayed" | "period";
  daysUntilNextPhase: number;
  cycleDay: number;
  cyclesLogged: number;
  coefficientOfVar: number;
  insights: string[];
}

export class PredictionEngine {
  /**
   * Layer 1: Statistical Baseline
   * Calculates the mean cycle length and period duration.
   */
  static async calculateLayer1(userId: string) {
    const cycles = await prisma.cycleRecord.findMany({
      where: { userId, isComplete: true },
      orderBy: { startDate: "desc" },
      take: 6,
    });

    if (cycles.length === 0) return null;

    // Filter to only include realistic cycle lengths (between 21 and 38 days)
    const lengths = cycles
      .map((c: any) => c.cycleLengthDays!)
      .filter((l: number) => l >= 21 && l <= 38);

    const durations = cycles.map((c: any) => c.periodDurationDays!).filter((d: number) => d > 0);

    // Only apply historical prediction layer if user has at least 3 consistent realistic cycles
    if (lengths.length >= 3) {
      const lastThree = lengths.slice(0, 3);
      const maxLen = Math.max(...lastThree);
      const minLen = Math.min(...lastThree);
      
      if ((maxLen - minLen) <= 3) {
        const avgCycleLength = lastThree.reduce((a: number, b: number) => a + b, 0) / 3;
        const avgPeriodDuration = durations.length > 0
          ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
          : 5;

        const mean = avgCycleLength;
        const variance = lastThree.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / 3;
        const stdDev = Math.sqrt(variance);

        return {
          avgCycleLength,
          avgPeriodDuration,
          stdDev,
          count: lastThree.length,
        };
      }
    }

    return null; // Fallback to onboarding profile baseline
  }

  /**
   * Layer 2: Adaptive Signal Processing (Signals)
   * Adjusts for stress, sleep, and energy patterns based on recent logs.
   */
  static async calculateAdaptiveLayer(userId: string, baselineLength: number): Promise<{ adjustment: number; insights: string[] }> {
    const last14Days = new Date();
    last14Days.setDate(last14Days.getDate() - 14);

    const logs = await prisma.cycleLog.findMany({
      where: {
        userId,
        date: { gte: last14Days },
      },
    });

    if (logs.length === 0) return { adjustment: 0, insights: [] };

    let adjustment = 0;
    const insights: string[] = [];

    // 1. Stress Aggregation
    const stressLogs = logs.filter(l => (l as any).crampIntensity && (l as any).crampIntensity >= 4);
    if (stressLogs.length >= 3) {
      adjustment += 1.5;
      insights.push("High stress levels detected — this might slightly delay your next period. 🧘‍♀️");
    }

    // 2. Sleep Quality
    const avgSleep = logs.reduce((acc, curr) => acc + (curr.sleepQuality || 3), 0) / logs.length;
    if (avgSleep <= 2.5) {
      adjustment += 0.5;
      insights.push("Your sleep quality has been low lately. REST is your magic superpower right now! 💤");
    }

    // 3. Energy Peaks
    const energyLogs = logs.filter(l => (l.energyLevel || 0) >= 4);
    if (energyLogs.length >= 3) {
      insights.push("Your energy is high! It's a great time for creative projects or movement. ⚡");
    }

    return { adjustment, insights };
  }

  /**
   * Layer 4: Adaptive Confidence Window
   */
  static getConfidenceLevel(count: number, cv: number): string {
    if (count < 1) return "none";
    if (count < 3) return "getting_started";
    if (cv > 20) return "irregular";
    if (cv < 8 && count >= 5) return "high";
    if (cv < 15) return "confident";
    return "building";
  }

  /**
   * Main Prediction Flow
   */
  static async predict(userId: string): Promise<PredictionResult | null> {
    const profile = await prisma.cycleProfile.findUnique({ where: { userId } });
    if (!profile || !profile.lastPeriodStart) return null;

    const l1 = await this.calculateLayer1(userId);
    const avgLength = l1?.avgCycleLength || profile.avgCycleLength || 28;
    const stdDev = l1?.stdDev || 0;
    const count = l1?.count || 0;
    const cv = l1 ? (stdDev / avgLength) * 100 : 15;

    // Adaptive adjustment
    const adaptive = await this.calculateAdaptiveLayer(userId, avgLength);
    const totalLength = avgLength + adaptive.adjustment;

    // Period Prediction
    const predictedStart = new Date(profile.lastPeriodStart);
    predictedStart.setDate(predictedStart.getDate() + Math.round(totalLength));

    // Confidence Window
    let windowDays = 2;
    if (cv > 20) windowDays = 7;
    else if (cv > 10) windowDays = 4;
    else if (cv < 5) windowDays = 1;

    const windowEarly = new Date(predictedStart);
    windowEarly.setDate(windowEarly.getDate() - windowDays);

    const windowLate = new Date(predictedStart);
    windowLate.setDate(windowLate.getDate() + windowDays);

    // Fertility Window (Standard Days Method fallback)
    const ovulationDate = new Date(predictedStart);
    ovulationDate.setDate(ovulationDate.getDate() - 14);

    const fertilityStart = new Date(ovulationDate);
    fertilityStart.setDate(fertilityStart.getDate() - 4);

    const fertilityEnd = new Date(ovulationDate);
    fertilityEnd.setDate(fertilityEnd.getDate() + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = predictedStart.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const daysSinceStart = Math.ceil((today.getTime() - profile.lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const currentPhase = this.calculatePhase(daysSinceStart, avgLength, profile.lastPeriodStart, profile.lastPeriodEnd);
    const nextPhaseInfo = this.calculateNextPhase(daysSinceStart, avgLength, profile.lastPeriodStart, profile.lastPeriodEnd);

    return {
      predictedStart,
      windowEarly,
      windowLate,
      ovulationDate,
      fertilityStart,
      fertilityEnd,
      confidenceLevel: this.getConfidenceLevel(count, cv) as any,
      daysUntilPrediction: daysUntil,
      currentPhase,
      nextPhase: nextPhaseInfo.name,
      daysUntilNextPhase: nextPhaseInfo.daysLeft,
      cycleDay: daysSinceStart,
      cyclesLogged: count,
      coefficientOfVar: cv,
      insights: adaptive.insights,
    };
  }

  private static calculatePhase(day: number, avgLength: number, lastPeriodStart: Date | null, lastPeriodEnd: Date | null): any {
    if (lastPeriodEnd && lastPeriodStart && new Date(lastPeriodEnd).getTime() >= new Date(lastPeriodStart).getTime()) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const end = new Date(lastPeriodEnd);
      end.setUTCHours(0, 0, 0, 0);
      if (today >= end) {
        // Period has completed. Move out of menstrual phase.
        if (day <= avgLength * 0.45) return "follicular";
        if (day <= avgLength * 0.55) return "ovulation";
        if (day <= avgLength) return "luteal";
        return "delayed";
      }
    }

    if (lastPeriodStart) {
      // Period has started and period end has not been marked yet!
      return "menstrual";
    }

    if (day <= 5) return "menstrual";
    if (day <= avgLength * 0.45) return "follicular";
    if (day <= avgLength * 0.55) return "ovulation";
    if (day <= avgLength) return "luteal";
    return "delayed";
  }

  private static calculateNextPhase(day: number, avgLength: number, lastPeriodStart: Date | null, lastPeriodEnd: Date | null): { name: any; daysLeft: number } {
    const follicularStart = 6;
    const ovulationStart = Math.floor(avgLength * 0.45) + 1;
    const lutealStart = Math.floor(avgLength * 0.55) + 1;
    const periodStart = Math.floor(avgLength) + 1;

    if (lastPeriodEnd && lastPeriodStart && new Date(lastPeriodEnd).getTime() >= new Date(lastPeriodStart).getTime()) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const end = new Date(lastPeriodEnd);
      end.setUTCHours(0, 0, 0, 0);
      if (today >= end) {
        // Already past menstrual phase. Follicular phase has started.
        if (day < ovulationStart) {
          return { name: "ovulation", daysLeft: ovulationStart - day };
        }
        if (day < lutealStart) {
          return { name: "luteal", daysLeft: lutealStart - day };
        }
        if (day < periodStart) {
          return { name: "period", daysLeft: periodStart - day };
        }
        return { name: "period", daysLeft: 0 };
      }
    }

    if (lastPeriodStart) {
      return { name: "follicular", daysLeft: 1 };
    }
    
    if (day < follicularStart) {
      return { name: "follicular", daysLeft: follicularStart - day };
    }
    if (day < ovulationStart) {
      return { name: "ovulation", daysLeft: ovulationStart - day };
    }
    if (day < lutealStart) {
      return { name: "luteal", daysLeft: lutealStart - day };
    }
    if (day < periodStart) {
      return { name: "period", daysLeft: periodStart - day };
    }
    return { name: "period", daysLeft: 0 };
  }
}
