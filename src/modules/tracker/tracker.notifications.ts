import { prisma } from "../../db/client.js";

export type TrackerNotificationType = 
  | "PREDICTION_ALERT" 
  | "DAILY_LOG_REMINDER" 
  | "LATE_PERIOD" 
  | "PHASE_CHANGE" 
  | "DOCTOR_CONNECT" 
  | "MILESTONE_CELEBRATION";

interface NotificationPayload {
  title: string;
  body: string;
  deepLink: string;
}

export class TrackerNotificationService {
  /**
   * Evaluates all active users for daily tracker notifications.
   * Triggered by a 4:00 AM UTC cron job.
   */
  static async evaluateDailyNotifications() {
    // 1. Get all active cycle profiles
    const profiles = await prisma.cycleProfile.findMany({
      where: { trackerMode: { not: "watching_waiting" as any } },
    });

    for (const profile of (profiles as any[])) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Prediction Alert (3 days before)
      if (profile.predictedNextStart) {
        const diffDays = Math.ceil((new Date(profile.predictedNextStart).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 3) {
          await this.send(profile.userId, "PREDICTION_ALERT");
        }
      }

      // Late Period Alert (5 days after)
      if (profile.predictedNextStart) {
        const diffDays = Math.ceil((today.getTime() - new Date(profile.predictedNextStart).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 5) {
          const recentLog = await prisma.cycleLog.findFirst({
            where: { 
              userId: profile.userId, 
              flow: { not: "none" }, // light, medium, heavy, spotting
              date: { gte: new Date(profile.predictedNextStart) } 
            }
          });
          if (!recentLog) {
            await this.send(profile.userId, "LATE_PERIOD");
          }
        }
      }
    }
  }

  /**
   * Evaluates and sends log reminders.
   */
  static async checkDailyLogReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loggedToday = await prisma.cycleLog.findMany({
      where: { date: today },
      select: { userId: true },
    });
    const loggedUserIds = new Set(loggedToday.map(l => l.userId));

    const activeUsers = await prisma.cycleProfile.findMany({ 
      select: { userId: true, currentLogStreak: true } as any 
    });

    for (const user of (activeUsers as any[])) {
      if (!loggedUserIds.has(user.userId)) {
        await this.send(user.userId, "DAILY_LOG_REMINDER", { streak: user.currentLogStreak });
      }
    }
  }

  private static async send(userId: string, type: TrackerNotificationType, data?: any) {
    const payloads: Record<TrackerNotificationType, NotificationPayload> = {
      PREDICTION_ALERT: {
        title: "Your period may be coming soon 🌸",
        body: "Based on your cycle, your period could arrive in about 3 days. Time to prep? Here are some tips and reminders.",
        deepLink: "infano://tracker/prediction",
      },
      DAILY_LOG_REMINDER: {
        title: data?.streak > 0 ? `🔥 ${data.streak}-day streak! Keep it going!` : "Time to log your day 🌸",
        body: "Tap to do your quick daily log — it takes less than a minute!",
        deepLink: "infano://tracker/log",
      },
      LATE_PERIOD: {
        title: "Your period is taking its time 🌿",
        body: "Your period hasn't arrived yet — and that's okay. Cycles vary for lots of reasons. Here's what might be happening.",
        deepLink: "infano://tracker/insights",
      },
      PHASE_CHANGE: {
        title: "Energy may be picking up soon 🌱",
        body: "You may be entering your follicular phase — many girls feel more energized and motivated. Here's what to expect!",
        deepLink: "infano://tracker/phase",
      },
      DOCTOR_CONNECT: {
        title: "Your cycle has a pattern worth noting 🩺",
        body: "You've logged intense cramps for 3 months. While normal, it might be worth mentioning to a healthcare provider.",
        deepLink: "infano://tracker/doctor-connect",
      },
      MILESTONE_CELEBRATION: {
        title: "First cycle logged! 🌸",
        body: "You've logged your way through a complete cycle — that's real self-knowledge. Here's your cycle snapshot.",
        deepLink: "infano://tracker/insights",
      },
    };

    const payload = payloads[type];
    if (!payload) return;

    logger.info(`[Push Notification] User ${userId}: ${payload.title}`);
  }
}

import { logger } from "../../config/logger.js";
