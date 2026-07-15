import { prisma } from "../../db/client.js";
import { logger } from "../../config/logger.js";
import { FirebaseService } from "../../common/services/firebase.service.js";

export type TrackerNotificationType = 
  | "PERIOD_PREDICTION" 
  | "DAILY_LOG_REMINDER" 
  | "SYMPTOM_PATTERN" 
  | "LATE_PERIOD" 
  | "PHASE_CHANGE" 
  | "DOCTOR_CONNECT" 
  | "CYCLE_MILESTONE"
  | "STREAK_AT_RISK"
  | "MONTHLY_INSIGHTS";

interface NotificationPayload {
  title: string;
  body: string;
  deepLink: string;
  optOutLabel: string;
}

export class TrackerNotificationService {
  /**
   * Main entry point for the daily 4:00 AM evaluation.
   */
  static async evaluateDailyNotifications() {
    logger.info("Starting daily notification evaluation...");
    
    // Process all active users to support in-app notifications even without FCM tokens
    const users = await prisma.user.findMany({
      where: { 
        accountStatus: "ACTIVE"
      },
      include: {
        cycleProfile: true,
        NotificationPreferences: true
      }
    });

    for (const user of users) {
      try {
        await this.evaluateUserNotifications(user);
      } catch (err) {
        logger.error({ err, userId: user.id }, "Failed to evaluate notifications for user");
      }
    }
  }

  private static async evaluateUserNotifications(user: any) {
    const { cycleProfile, NotificationPreferences: prefs } = user;
    if (!cycleProfile || !prefs || !prefs.globalEnabled) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Period Prediction Alert (3 days before)
    if (prefs.periodPrediction && cycleProfile.predictedNextStart) {
      const diffDays = Math.ceil((new Date(cycleProfile.predictedNextStart).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 3) {
        await this.send(user.id, "PERIOD_PREDICTION");
      }
    }

    // 2. Symptom Patterns Alert (Opt-in)
    if (prefs.symptomPatterns) {
      await this.evaluateSymptomPatterns(user);
    }

    // 3. Monthly Insights Ready (Opt-in)
    // Triggered on the first day of the calendar month
    if (prefs.monthlyInsights && today.getDate() === 1) {
      await this.send(user.id, "MONTHLY_INSIGHTS");
    }

    // 4. Late Period Alert (5 days after)
    if (prefs.latePeriod && cycleProfile.predictedNextStart) {
      const diffDays = Math.ceil((today.getTime() - new Date(cycleProfile.predictedNextStart).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 5) {
        const periodStarted = await prisma.cycleLog.findFirst({
          where: { 
            userId: user.id, 
            flow: { in: ["light", "medium", "heavy"] },
            date: { gte: cycleProfile.predictedNextStart }
          }
        });
        if (!periodStarted) {
          await this.send(user.id, "LATE_PERIOD", { irregular: cycleProfile.trackerMode === "irregular_support" });
        }
      }
    }

    // 5. Phase Change Notification (Opt-in)
    if (prefs.phaseChange) {
      const updatedAt = new Date(cycleProfile.updatedAt);
      updatedAt.setHours(0, 0, 0, 0);
      if (updatedAt.getTime() === today.getTime()) {
         await this.send(user.id, "PHASE_CHANGE", { phase: cycleProfile.currentPhase });
      }
    }

    // 6. Doctor Connect Prompt (Clinical Patterns)
    if (prefs.doctorConnect) {
       await this.evaluateDoctorConnect(user);
    }

    // 7. Cycle Milestones
    if (prefs.cycleMilestones) {
       await this.evaluateMilestones(user);
    }
  }

  /**
   * Evaluates and sends log reminders.
   * Triggered by a separate cron or user-specific time check.
   */
  static async checkDailyLogReminders() {
    const now = new Date();

    const users = await prisma.user.findMany({
      where: {
        NotificationPreferences: {
          dailyReminder: true,
          globalEnabled: true
        }
      },
      include: { NotificationPreferences: true, cycleProfile: true, profile: true }
    });

    for (const user of users) {
      const prefs = user.NotificationPreferences!;
      
      // Determine user's local time string "HH:mm" in their timezone
      const tz = user.timezone || "UTC";
      let localTimeStr: string;
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        localTimeStr = formatter.format(now);
      } catch (err) {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        localTimeStr = formatter.format(now);
      }

      if (localTimeStr !== prefs.dailyReminderTime) {
        continue;
      }

      // Check if logged today in user's local timezone
      let localDateStr: string;
      try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        localDateStr = formatter.format(now);
      } catch (e) {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        localDateStr = formatter.format(now);
      }

      const logDate = new Date(`${localDateStr}T00:00:00.000Z`);

      const log = await prisma.cycleLog.findUnique({
        where: { userId_date: { userId: user.id, date: logDate } }
      });
      
      if (log && log.flow !== null && log.flow !== "none") continue; // Already logged

      await this.send(user.id, "DAILY_LOG_REMINDER", { 
        streak: user.cycleProfile?.currentLogStreak || 0,
        name: user.profile?.displayName || "friend"
      });
    }
  }

  /**
   * Checks and sends "Streak At Risk" notifications at 22:00 user local time.
   */
  static async checkStreakAtRiskAlerts() {
    const now = new Date();

    const users = await prisma.user.findMany({
      where: {
        NotificationPreferences: {
          streakAtRisk: true,
          globalEnabled: true
        },
        cycleProfile: {
          currentLogStreak: { gt: 0 }
        }
      },
      include: { NotificationPreferences: true, cycleProfile: true }
    });

    for (const user of users) {
      const tz = user.timezone || "UTC";
      let localTimeStr: string;
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        localTimeStr = formatter.format(now);
      } catch (err) {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        localTimeStr = formatter.format(now);
      }

      // We alert the user at 22:00 (10:00 PM) user local time
      if (localTimeStr !== "22:00") {
        continue;
      }

      // Check if logged today in user's local timezone
      let localDateStr: string;
      try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        localDateStr = formatter.format(now);
      } catch (e) {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        localDateStr = formatter.format(now);
      }

      const logDate = new Date(`${localDateStr}T00:00:00.000Z`);

      const log = await prisma.cycleLog.findUnique({
        where: { userId_date: { userId: user.id, date: logDate } }
      });

      if (log && log.flow !== null && log.flow !== "none") continue; // Already logged today, streak is safe!

      await this.send(user.id, "STREAK_AT_RISK", {
        streak: user.cycleProfile?.currentLogStreak || 0
      });
    }
  }

  private static async evaluateDoctorConnect(user: any) {
    const lastSent = await prisma.notificationHistory.findFirst({
        where: { userId: user.id, type: "DOCTOR_CONNECT", sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    });
    if (lastSent) return; // Max 1 per 30 days

    const recentCycles = await prisma.cycleRecord.findMany({
        where: { userId: user.id, isComplete: true },
        orderBy: { cycleNumber: "desc" },
        take: 3
    });

    if (recentCycles.length === 3) {
        const highCramps = recentCycles.every(c => (c.avgCrampIntensity || 0) >= 4);
        const longPeriods = recentCycles.slice(0, 2).every(c => (c.periodDurationDays || 0) > 8);
        
        if (highCramps || longPeriods) {
            await this.send(user.id, "DOCTOR_CONNECT");
        }
    }
  }

  private static async evaluateMilestones(user: any) {
    const cycleCount = await prisma.cycleRecord.count({ where: { userId: user.id, isComplete: true } });
    
    if (cycleCount === 1) {
        const alreadySent = await prisma.notificationHistory.findFirst({ 
          where: { 
            userId: user.id, 
            type: "CYCLE_MILESTONE", 
            payload: { path: ["milestone"], equals: "first_cycle" } 
          } 
        });
        if (!alreadySent) {
            await this.send(user.id, "CYCLE_MILESTONE", { milestone: "first_cycle" });
        }
    }
  }

  /**
   * Helper to detect and notify if user has recurring symptom patterns (logged same symptom >= 3 times in 30 days)
   */
  private static async evaluateSymptomPatterns(user: any) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.cycleLog.findMany({
      where: {
        userId: user.id,
        date: { gte: thirtyDaysAgo }
      }
    });

    const symptomCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.symptoms && Array.isArray(log.symptoms)) {
        for (const symptom of log.symptoms) {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        }
      }
    }

    const recurringSymptom = Object.keys(symptomCounts).find(
      (symptom) => (symptomCounts[symptom] ?? 0) >= 3
    );

    if (recurringSymptom) {
      const thirtyDaysAgoForHistory = new Date();
      thirtyDaysAgoForHistory.setDate(thirtyDaysAgoForHistory.getDate() - 30);
      const alreadySent = await prisma.notificationHistory.findFirst({
        where: {
          userId: user.id,
          type: "SYMPTOM_PATTERN",
          sentAt: { gte: thirtyDaysAgoForHistory }
        }
      });

      if (!alreadySent) {
        await this.send(user.id, "SYMPTOM_PATTERN", { symptom: recurringSymptom });
      }
    }
  }

  private static async send(userId: string, type: TrackerNotificationType, data?: any) {
    // 1. Check Preferences again & Global Toggle
    const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        include: { NotificationPreferences: true } 
    });
    if (!user || !user.NotificationPreferences?.globalEnabled) return;

    // 2. Duplicate Check (Same type, Same day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.notificationHistory.findFirst({
        where: { userId, type, sentAt: { gte: today } }
    });
    if (existing) return;

    // 3. Construct Payload
    const payloads: Record<TrackerNotificationType, NotificationPayload> = {
      PERIOD_PREDICTION: {
        title: "Your period may be arriving soon 🩸",
        body: data?.irregular 
            ? `Your period may arrive sometime in the next few days — we're still learning your rhythm 💜`
            : "Based on your cycle history, your period may start in about 3 days. Just a heads up — not a deadline 💜",
        deepLink: "infano://tracker/prediction",
        optOutLabel: "Period prediction reminders"
      },
      DAILY_LOG_REMINDER: {
        title: data?.streak >= 7 ? "7 days in a row! 🎉 Gigi wants to celebrate!" 
             : data?.streak >= 3 ? `🔥 Day ${data.streak} streak — keep it going!`
             : `Quick check-in, ${data?.name || "friend"}? 🌸`,
        body: data?.streak >= 7 ? "A full week of logs! Your predictions just got way more accurate. Tap to collect your bonus."
            : "One minute of logging today builds a month of insights tomorrow. Tap to log now →",
        deepLink: "infano://tracker/log",
        optOutLabel: "Daily log reminders"
      },
      LATE_PERIOD: {
        title: "Still waiting? 💜",
        body: data?.irregular
            ? "Your period hasn't arrived in your typical window — given your irregular cycle, this can be normal. Here's more info."
            : "Your period is a few days later than expected — which is completely normal. Late periods happen for many reasons.",
        deepLink: "infano://tracker/insights",
        optOutLabel: "Late period alerts"
      },
      PHASE_CHANGE: {
        title: data?.phase === "follicular" ? "Energy may be picking up soon 🌱"
             : data?.phase === "ovulation" ? "Your peak phase may be starting ✨"
             : data?.phase === "luteal" ? "Time to take it a little gentler 🌙"
             : "New phase starting ✨",
        body: `You've entered your ${data?.phase} phase. Tap to see what this means for your energy and mood.`,
        deepLink: "infano://tracker/phase",
        optOutLabel: "Phase change reminders"
      },
      SYMPTOM_PATTERN: {
        title: "Your body has a pattern 💡",
        body: `I've noticed a recurring pattern in your symptoms${data?.symptom ? ` (${data.symptom})` : ""}. There's something worth knowing about this 💜`,
        deepLink: "infano://tracker/insights",
        optOutLabel: "Cycle pattern insights"
      },
      DOCTOR_CONNECT: {
        title: "Your cycle has a pattern worth noting 🩺",
        body: "You've logged intense symptoms for 3 months. While often normal, it might be helpful to share with a provider.",
        deepLink: "infano://tracker/doctor-connect",
        optOutLabel: "Healthcare provider prompts"
      },
      CYCLE_MILESTONE: {
        title: "You completed your first full cycle! 🌸",
        body: "You've logged your way through a complete cycle — that's real self-knowledge. See your first snapshot.",
        deepLink: "infano://tracker/insights",
        optOutLabel: "Cycle celebration notifications"
      },
      STREAK_AT_RISK: {
        title: "Save your streak! 🔥",
        body: `Log today to save your ${data?.streak || 0}-day tracking streak before midnight.`,
        deepLink: "infano://tracker/log",
        optOutLabel: "Streak at risk alerts"
      },
      MONTHLY_INSIGHTS: {
        title: "Your Monthly Insights are ready! 📊",
        body: "Your monthly reflection and analytics are compiled. Tap to view your insights summary 💜",
        deepLink: "infano://tracker/insights",
        optOutLabel: "Monthly insights ready notifications"
      }
    };

    const payload = payloads[type];
    
    // 4. Send via Firebase if token exists
    if (user.fcmToken) {
      try {
        await FirebaseService.sendPushNotification(user.fcmToken, {
            title: payload.title,
            body: payload.body,
            deepLink: payload.deepLink,
            data: { notificationType: type }
        });
      } catch (err) {
        logger.error({ err, userId }, "Failed to send push notification");
      }
    }

    // 5. Record History
    await prisma.notificationHistory.create({
        data: {
            userId,
            type,
            title: payload.title,
            body: payload.body,
            deepLink: payload.deepLink,
            payload: data || {}
        }
    });
  }
}
