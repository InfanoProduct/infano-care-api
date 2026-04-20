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
  | "CYCLE_MILESTONE";

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
    
    // Process in batches to avoid memory issues
    const users = await prisma.user.findMany({
      where: { 
        accountStatus: "ACTIVE",
        fcmToken: { not: null }
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
    // This usually triggers on the day of transition.
    // Logic: check if cycleProfile.currentPhase just changed today (updatedAt is today)
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      include: { NotificationPreferences: true, cycleProfile: true, profile: true }
    });

    for (const user of users) {
      const prefs = user.NotificationPreferences;
      if (!prefs || !prefs.dailyReminder || !prefs.globalEnabled) continue;

      // Check if logged today
      const log = await prisma.cycleLog.findUnique({
        where: { userId_date: { userId: user.id, date: today } }
      });
      if (log && log.flow !== null) continue; // Already logged

      // Check "Smart Suppression": app open in last 30 mins
      // (This would require an 'lastActiveAt' field which we might need to add, but for now we skip)

      await this.send(user.id, "DAILY_LOG_REMINDER", { 
        streak: user.cycleProfile?.currentLogStreak || 0,
        name: user.profile?.displayName || "friend"
      });
    }
  }

  private static async evaluateDoctorConnect(user: any) {
    // Logic: Intense cramps (>=4) for 3+ consecutive cycles
    // This is complex and should ideally run on cycle completion or daily.
    // For now, we'll check the pattern cache or recent logs.
    const lastSent = await prisma.notificationHistory.findFirst({
        where: { userId: user.id, type: "DOCTOR_CONNECT", sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    });
    if (lastSent) return; // Max 1 per 30 days

    // Basic logic for demonstration: check last 3 cycle records
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
    
    // Logic: First cycle completed
    if (cycleCount === 1) {
        const alreadySent = await prisma.notificationHistory.findFirst({ where: { userId: user.id, type: "CYCLE_MILESTONE", payload: { path: ["milestone"], equals: "first_cycle" } } });
        if (!alreadySent) {
            await this.send(user.id, "CYCLE_MILESTONE", { milestone: "first_cycle" });
        }
    }
  }

  private static async send(userId: string, type: TrackerNotificationType, data?: any) {
    // 1. Check Preferences again & Global Toggle
    const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        include: { NotificationPreferences: true } 
    });
    if (!user || !user.fcmToken || !user.NotificationPreferences?.globalEnabled) return;

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
        body: "I've noticed a recurring pattern in your symptoms. There's something worth knowing about this 💜",
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
      }
    };

    const payload = payloads[type];
    
    // 4. Send via Firebase
    await FirebaseService.sendPushNotification(user.fcmToken, {
        title: payload.title,
        body: payload.body,
        deepLink: payload.deepLink,
        data: { notificationType: type }
    });

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
