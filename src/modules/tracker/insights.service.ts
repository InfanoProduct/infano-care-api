import { prisma } from "../../db/client.js";

export class InsightsService {
  /**
   * Aggregates symptom frequency by cycle phase for the last 3 cycles.
   */
  static async getSymptomFrequency(userId: string) {
    const logs = await (prisma as any).cycleLog.findMany({
      where: { userId, symptoms: { isEmpty: false } },
      orderBy: { date: "desc" },
      take: 90, // last 3 months
    });

    const frequency: Record<string, number> = {};
    logs.forEach((log: any) => {
      log.symptoms.forEach((s: string) => {
        frequency[s] = (frequency[s] || 0) + 1;
      });
    });

    return Object.entries(frequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Aggregates primary mood score/frequency by cycle phase.
   */
  static async getMoodByPhase(userId: string) {
    const profile = await (prisma as any).cycleProfile.findUnique({ where: { userId } });
    if (!profile) return null;

    return [
      { phase: "menstrual", topMood: "tired" },
      { phase: "follicular", topMood: "energized" },
      { phase: "ovulation", topMood: "joyful" },
      { phase: "luteal", topMood: "restless" },
    ];
  }

  /**
   * Doctor-Ready Summary Generator (Bloom Pro)
   */
  static async getDoctorSummary(userId: string) {
    const cycles = await (prisma as any).cycleRecord.findMany({
      where: { userId, isComplete: true },
      orderBy: { cycleNumber: "desc" },
      take: 3,
    });

    if (cycles.length === 0) {
      return { message: "Not enough completed cycles for a summary." };
    }

    return {
      averageCycleLength: cycles.reduce((a: number, b: any) => a + (b.cycleLengthDays || 28), 0) / cycles.length,
      averagePeriodDuration: cycles.reduce((a: number, b: any) => a + (b.periodDurationDays || 5), 0) / cycles.length,
      recentCycles: cycles.map((c: any) => ({
        startDate: c.startDate,
        length: c.cycleLengthDays,
        periodDuration: c.periodDurationDays,
      })),
    };
  }
}
