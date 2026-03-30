import { prisma } from "../../db/client.js";

export interface PredictionResult {
  predictedStart: Date;
  windowEarly: Date;
  windowLate: Date;
  confidenceLevel: "none" | "getting_started" | "building" | "confident" | "high" | "irregular";
  daysUntilPrediction: number;
  currentPhase: "menstrual" | "follicular" | "ovulation" | "luteal" | "waiting";
  cycleDay: number;
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
   * Layer 2: Pattern Recognition
   * Adjusts for stress/sleep patterns (Simplified for MVP).
   */
  static calculateLayer2(baseline: number, recentStressScore: number, recentSleepQuality: number): number {
    let adjustment = 0;
    // If stress is high (e.g. 4-5), cycle might be slightly elongated
    if (recentStressScore >= 4) adjustment += 1;
    // If sleep is poor, cycle might shift
    if (recentSleepQuality <= 2) adjustment += 0.5;
    
    return baseline + adjustment;
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
    const avgLength = l1?.avgCycleLength || 28;
    const stdDev = l1?.stdDev || 0;
    const count = l1?.count || 0;
    const cv = l1 ? (stdDev / avgLength) * 100 : 15;

    // Basic calculation
    const predictedStart = new Date(profile.lastPeriodStart);
    predictedStart.setDate(predictedStart.getDate() + Math.round(avgLength));

    // Confidence Window
    let windowDays = 2;
    if (cv > 20) windowDays = 7;
    else if (cv > 10) windowDays = 4;
    else if (cv < 5) windowDays = 1;

    const windowEarly = new Date(predictedStart);
    windowEarly.setDate(windowEarly.getDate() - windowDays);

    const windowLate = new Date(predictedStart);
    windowLate.setDate(windowLate.getDate() + windowDays);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = predictedStart.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const daysSinceStart = Math.ceil((today.getTime() - profile.lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      predictedStart,
      windowEarly,
      windowLate,
      confidenceLevel: this.getConfidenceLevel(count, cv) as any,
      daysUntilPrediction: daysUntil,
      currentPhase: this.calculatePhase(daysSinceStart, avgLength),
      cycleDay: daysSinceStart,
    };
  }

  private static calculatePhase(day: number, avgLength: number): any {
    if (day <= 5) return "menstrual";
    if (day <= avgLength * 0.45) return "follicular";
    if (day <= avgLength * 0.55) return "ovulation";
    if (day <= avgLength) return "luteal";
    return "waiting";
  }
}
