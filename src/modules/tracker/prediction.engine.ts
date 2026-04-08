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
  currentPhase: "menstrual" | "follicular" | "ovulation" | "luteal" | "waiting";
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

    const lengths = cycles.map((c: any) => c.cycleLengthDays!).filter((l: number) => l > 0);
    const durations = cycles.map((c: any) => c.periodDurationDays!).filter((d: number) => d > 0);

    const avgCycleLength = lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length;
    const avgPeriodDuration = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;

    // Standard Deviation for L4
    const mean = avgCycleLength;
    const variance = lengths.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    return {
      avgCycleLength,
      avgPeriodDuration,
      stdDev,
      count: lengths.length,
    };
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

    return {
      predictedStart,
      windowEarly,
      windowLate,
      ovulationDate,
      fertilityStart,
      fertilityEnd,
      confidenceLevel: this.getConfidenceLevel(count, cv) as any,
      daysUntilPrediction: daysUntil,
      currentPhase: this.calculatePhase(daysSinceStart, avgLength),
      cycleDay: daysSinceStart,
      cyclesLogged: count,
      coefficientOfVar: cv,
      insights: adaptive.insights,
    };
  }

  private static calculatePhase(day: number, avgLength: number): any {
    if (day <= 5) return "menstrual";
    if (day <= avgLength * 0.45) return "follicular";
    // Ovulation is roughly 14 days before the next period, but we'll show a window
    if (day >= avgLength * 0.45 && day <= avgLength * 0.55) return "ovulation";
    if (day <= avgLength) return "luteal";
    return "waiting";
  }
}
