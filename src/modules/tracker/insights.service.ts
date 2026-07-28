import { prisma } from "../../db/client.js";
import { PredictionEngine } from "./prediction.engine.js";

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

  /**
   * Returns phase-specific stories (Daily Insights) and articles (Good to Know)
   * for the dashboard. Data is fetched entirely from the database.
   *
   * Priority:
   *  1. Day-specific entries (cycleDay == user's current cycle day)
   *  2. Phase-wide entries (cycleDay IS NULL)
   *
   * Falls back to the "waiting" phase if the user has no profile yet.
   */
  static async getDailyInsights(userId: string) {
    const profile = await (prisma as any).cycleProfile.findUnique({ where: { userId } });
    if (!profile) return { phase: "waiting", cycleDay: null, insights: [], articles: [] };

    // Get current predicted phase dynamically instead of stale DB value
    const prediction = await PredictionEngine.predict(userId);
    const phase: string = prediction?.currentPhase || profile.currentPhase || "waiting";
    const cycleDay: number | null = prediction?.cycleDay ?? profile.currentCycleDay ?? null;

    // ── Fetch Insights ───────────────────────────────────────────────────────
    const insights = await (prisma as any).trackerInsight.findMany({
      where: {
        phase,
        isActive: true,
        OR: [
          { cycleDay: null },           // phase-wide
          { cycleDay: cycleDay ?? -1 }, // day-specific
        ],
      },
      orderBy: { sortOrder: "asc" },
      include: {
        stories: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            content: true,
            imageUrl: true,
            order: true,
          },
        },
      },
    });

    // ── Fetch Articles ───────────────────────────────────────────────────────
    const articles = await (prisma as any).trackerArticle.findMany({
      where: {
        phase,
        isActive: true,
        OR: [
          { cycleDay: null },
          { cycleDay: cycleDay ?? -1 },
        ],
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        readTime: true,
        emoji: true,
        url: true,
      },
    });

    return {
      phase,
      cycleDay,
      insights: insights.map((i: any) => ({
        id: i.id,
        previewTitle: i.previewTitle,
        previewEmoji: i.previewEmoji,
        previewColorHex: i.previewColorHex,
        stories: i.stories.map((s: any) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          imageUrl: s.imageUrl || "",
        })),
      })),
      articles: articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        time: a.readTime,
        emoji: a.emoji,
        url: a.url || "",
      })),
    };
  }
}
