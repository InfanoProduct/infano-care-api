import { prisma } from "../../db/client.js";
import { normalizePhone } from "../../common/utils/phone.js";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import crypto from "crypto";
import { FirebaseService } from "../../common/services/firebase.service.js";
import { smsProvider } from "../auth/sms.service.js";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "rzp_test_mock",
  key_secret: env.RAZORPAY_KEY_SECRET || "mock_secret",
});

export class ParentService {
  static async invite(senderId: string, rawReceiverPhone: string) {
    const receiverPhone = normalizePhone(rawReceiverPhone);
    const sender = await prisma.user.findUnique({ 
      where: { id: senderId },
      include: { profile: true }
    });
    if (!sender) throw new Error("Sender not found");

    if (sender.phone === receiverPhone) {
      throw new Error("You cannot link with your own phone number.");
    }

    const receiver = await prisma.user.findUnique({ where: { phone: receiverPhone } });
    if (!receiver) {
      throw new Error("USER_NOT_FOUND");
    }

    let parentId = null;
    let teenId = null;
    if (sender.role === "PARENT" || sender.role === "GUARDIAN") {
      parentId = sender.id;
    } else if (sender.role === "TEEN") {
      teenId = sender.id;
    }
    if (receiver.role === "PARENT" || receiver.role === "GUARDIAN") {
      parentId = receiver.id;
    } else if (receiver.role === "TEEN") {
      teenId = receiver.id;
    }
    if (!parentId && !teenId) {
      parentId = sender.id;
      teenId = receiver.id;
    } else if (!parentId) {
      parentId = sender.id === teenId ? receiver.id : sender.id;
    } else if (!teenId) {
      teenId = sender.id === parentId ? receiver.id : sender.id;
    }

    // Check if there is an existing link where current sender is the sender, OR in the opposite direction
    const existing = await prisma.parentLink.findFirst({
      where: {
        OR: [
          { senderId, receiverPhone },
          ...(sender.phone ? [{ senderId: receiver.id, receiverPhone: sender.phone }] : [])
        ]
      }
    });

    if (existing) {
      if (existing.status === "LINKED") {
        throw new Error("Already linked");
      }
      // If we are the original sender, return the pending link
      if (existing.senderId === senderId) {
        return existing;
      }
      // If the other user was the sender, this invite is an acceptance!
      const updatedLink = await prisma.parentLink.update({
        where: { id: existing.id },
        data: { status: "LINKED" }
      });

      const accepterName = sender.profile?.displayName || sender.username || sender.phone;
      const type = "linkAcceptance";
      const title = "Link Request Accepted";
      const body = `${accepterName} has accepted your account linking request.`;
      const deepLink = "infano://account/family";

      // 1. Create InApp Notification History for original sender
      await prisma.notificationHistory.create({
        data: {
          userId: existing.senderId,
          type,
          title,
          body,
          deepLink,
          sentAt: new Date()
        }
      });

      // 2. Send Push Notification if FCM token is registered
      const originalSender = await prisma.user.findUnique({
        where: { id: existing.senderId },
        select: { fcmToken: true, phone: true }
      });
      if (originalSender?.fcmToken) {
        try {
          await FirebaseService.sendPushNotification(originalSender.fcmToken, {
            title,
            body,
            deepLink,
            data: { notificationType: type }
          });
        } catch (err) {
          console.error("Failed to send firebase push notification for link acceptance:", err);
        }
      }

      if (originalSender?.phone) {
        try {
          await smsProvider.sendAlert(originalSender.phone, `Hi! ${body}`);
        } catch (err) {
          console.error("Failed to send SMS for link acceptance:", err);
        }
      }

      return updatedLink;
    }

    const link = await prisma.parentLink.create({
      data: {
        senderId,
        receiverPhone,
        parentId,
        teenId,
        status: "PENDING"
      }
    });

    const senderName = sender.profile?.displayName || sender.username || sender.phone;
    const type = "linkRequest";
    const title = "Link Request Received";
    const body = `${senderName} wants to link accounts with you on Infano Care. Open Family Settings in your app to accept the request.`;
    const deepLink = "infano://account/family";

    // 1. Create InApp Notification History
    await prisma.notificationHistory.create({
      data: {
        userId: receiver.id,
        type,
        title,
        body,
        deepLink,
        sentAt: new Date()
      }
    });

    // 2. Send Push Notification if FCM token is registered
    if (receiver.fcmToken) {
      try {
        await FirebaseService.sendPushNotification(receiver.fcmToken, {
          title,
          body,
          deepLink,
          data: { notificationType: type }
        });
      } catch (err) {
        console.error("Failed to send firebase push notification for link request:", err);
      }
    }

    // 3. Send SMS Notification
    try {
      await smsProvider.sendAlert(receiverPhone, body);
    } catch (err) {
      console.error("Failed to send SMS for link request:", err);
    }

    return link;
  }

  static async calculateWellnessScore(teenId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // 1. Progress score (up to 30 points)
      const progressCount = await prisma.creativeNodeProgress.count({
        where: { userId: teenId }
      });
      const progressScore = Math.min(Math.round((progressCount / 10) * 30), 30);

      // 2. Session / support score (up to 30 points)
      const totalSessions = await prisma.expertSessionSchedule.count({
        where: { userId: teenId }
      });
      const completedSessions = await prisma.expertSessionSchedule.count({
        where: { userId: teenId, status: "COMPLETED" }
      });
      let sessionScore = 20; // base score for engagement
      if (totalSessions > 0) {
        sessionScore = Math.round((completedSessions / totalSessions) * 30);
      }

      // 3. Tracking score (up to 25 points)
      const cycleLogsCount = await prisma.cycleLog.count({
        where: {
          userId: teenId,
          date: { gte: thirtyDaysAgo }
        }
      });
      const trackingScore = Math.min(Math.round((cycleLogsCount / 15) * 25), 25);

      // 4. Community/Connect score (up to 15 points)
      const [joinedCircles, posts, replies] = await Promise.all([
        prisma.communityCircle.count({
          where: { members: { some: { id: teenId } } }
        }),
        prisma.communityPost.count({
          where: { authorId: teenId }
        }),
        prisma.communityReply.count({
          where: { authorId: teenId }
        })
      ]);
      const communityScore = Math.min((joinedCircles + posts + replies) * 5, 15);

      const totalScore = progressScore + sessionScore + trackingScore + communityScore;
      // Default minimum wellness score of 50 to make it look positive
      return Math.max(50, Math.min(totalScore, 100));
    } catch (err) {
      console.error('Failed to calculate wellness score:', err);
      return 75; // default fallback
    }
  }

  static async getLinks(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
      });
      const userPhone = user?.phone;

      const links = await prisma.parentLink.findMany({
        where: {
          OR: [
            { senderId: userId },
            { parentId: userId },
            { teenId: userId },
            ...(userPhone ? [{ receiverPhone: userPhone }] : [])
          ]
        },
        include: {
          parent: { include: { profile: true } },
          teen: { include: { profile: true } },
          sender: { include: { profile: true } }
        },
        orderBy: { createdAt: "desc" }
      });

      const receiverPhones = links.map(l => l.receiverPhone).filter(Boolean);
      const receiverUsers = receiverPhones.length > 0
        ? await prisma.user.findMany({
            where: { phone: { in: receiverPhones } },
            include: { profile: true }
          })
        : [];
      const receiverMap = new Map(receiverUsers.map(u => [u.phone, u]));

      // Calculate wellness score for each link if the requesting user is the parent
      return await Promise.all(links.map(async (link) => {
        let wellnessScore: number | null = null;
        if (link.parentId === userId && link.teenId) {
          wellnessScore = await this.calculateWellnessScore(link.teenId);
        }
        const receiverUser = receiverMap.get(link.receiverPhone);
        return {
          ...link,
          receiver: receiverUser || (link.teenId === link.senderId ? link.parent : link.teen),
          wellnessScore
        };
      }));
    } catch (err) {
      console.error('Failed to fetch links:', err);
      return [];
    }
  }

  static async cancelInvite(userId: string, linkId: string) {
    const link = await prisma.parentLink.findUnique({ where: { id: linkId } });
    if (!link) throw new Error("Link not found");
    if (link.senderId !== userId && link.parentId !== userId && link.teenId !== userId) {
      throw new Error("Unauthorized");
    }

    const deletedLink = await prisma.parentLink.delete({
      where: { id: linkId }
    });

    if (link.senderId !== userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });
      const declinerName = user?.profile?.displayName || user?.username || link.receiverPhone;
      const type = "linkDeclined";
      const title = "Link Request Declined";
      const body = `${declinerName} has declined your account linking request.`;
      const deepLink = "infano://account/family";

      // 1. Create InApp Notification History
      await prisma.notificationHistory.create({
        data: {
          userId: link.senderId,
          type,
          title,
          body,
          deepLink,
          sentAt: new Date()
        }
      });

      // 2. Send Push Notification if FCM token is registered
      const senderUser = await prisma.user.findUnique({
        where: { id: link.senderId },
        select: { fcmToken: true }
      });
      if (senderUser?.fcmToken) {
        try {
          await FirebaseService.sendPushNotification(senderUser.fcmToken, {
            title,
            body,
            deepLink,
            data: { notificationType: type }
          });
        } catch (err) {
          console.error("Failed to send firebase push notification for link decline:", err);
        }
      }
    }

    return deletedLink;
  }

  static async acceptInvite(userId: string, linkId: string) {
    const link = await prisma.parentLink.findUnique({ where: { id: linkId } });
    if (!link) throw new Error("Link not found");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    if (!user || user.phone !== link.receiverPhone) {
      throw new Error("Unauthorized");
    }

    let pId = link.parentId;
    let tId = link.teenId;
    const senderUser = await prisma.user.findUnique({ where: { id: link.senderId } });
    if (!pId && !tId && senderUser) {
      if (senderUser.role === "PARENT" || senderUser.role === "GUARDIAN") pId = senderUser.id;
      else if (senderUser.role === "TEEN") tId = senderUser.id;

      if (user.role === "PARENT" || user.role === "GUARDIAN") pId = user.id;
      else if (user.role === "TEEN") tId = user.id;
    }
    if (!pId && senderUser) pId = senderUser.id === tId ? user.id : senderUser.id;
    if (!tId && senderUser) tId = senderUser.id === pId ? user.id : senderUser.id;

    const updatedLink = await prisma.parentLink.update({
      where: { id: linkId },
      data: {
        status: "LINKED",
        parentId: pId,
        teenId: tId
      }
    });

    const accepterName = user.profile?.displayName || user.username || user.phone;
    const type = "linkAcceptance";
    const title = "Link Request Accepted";
    const body = `${accepterName} has accepted your account linking request.`;
    const deepLink = "infano://account/family";

    // 1. Create InApp Notification History
    await prisma.notificationHistory.create({
      data: {
        userId: link.senderId,
        type,
        title,
        body,
        deepLink,
        sentAt: new Date()
      }
    });

    // 2. Send Push Notification if FCM token is registered
    if (senderUser?.fcmToken) {
      try {
        await FirebaseService.sendPushNotification(senderUser.fcmToken, {
          title,
          body,
          deepLink,
          data: { notificationType: type }
        });
      } catch (err) {
        console.error("Failed to send firebase push notification for link acceptance:", err);
      }
    }

    // 3. Send SMS notification to sender
    if (senderUser?.phone) {
      try {
        await smsProvider.sendAlert(senderUser.phone, `Hi! ${body}`);
      } catch (err) {
        console.error("Failed to send SMS for link acceptance:", err);
      }
    }

    return updatedLink;
  }

  static async getDashboardSummary(userId: string) {
    // 1. Find linked daughter
    const link = await prisma.parentLink.findFirst({
      where: {
        parentId: userId,
        status: "LINKED"
      },
      include: {
        teen: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!link || !link.teenId) {
      return { isLinked: false };
    }

    const teenId = link.teenId;

    // 2. Active Journey (latest CreativeNodeProgress)
    const activeProgress = await prisma.creativeNodeProgress.findFirst({
      where: { userId: teenId },
      orderBy: { updatedAt: "desc" },
      include: {
        episode: {
          include: {
            journey: true
          }
        }
      }
    });

    let activeJourney = null;
    if (activeProgress && activeProgress.episode && activeProgress.episode.journey) {
      const journeyId = activeProgress.episode.journeyId;
      // Calculate completion based on completed nodes
      const totalEpisodes = await prisma.creativeEpisode.count({ where: { journeyId } });
      const completedCount = await prisma.creativeNodeProgress.count({
        where: {
          userId: teenId,
          episode: { journeyId },
          status: "COMPLETED"
        }
      });
      const percentComplete = totalEpisodes > 0 ? Math.min(100, Math.round((completedCount / (totalEpisodes * 5)) * 100)) : 0;
      
      activeJourney = {
        name: activeProgress.episode.journey.title,
        percentComplete,
        thumbnailUrl: null
      };
    }

    // 3. Mood Trend (30-day colour indicator to support 7/30 days toggle)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = await prisma.cycleLog.findMany({
      where: {
        userId: teenId,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: "asc" },
      select: { date: true, moodPrimary: true }
    });

    // 4. Next Expert Session
    const nextSession = await prisma.expertSessionSchedule.findFirst({
      where: {
        userId: teenId,
        scheduledAt: { gte: new Date() },
        status: { in: ["SCHEDULED", "RESCHEDULED"] }
      },
      orderBy: { scheduledAt: "asc" }
    });

    // 5. Program Enrollments
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        OR: [
          { userId: teenId },
          { userId } // Parent purchases
        ],
        status: "ACTIVE",
        program: { isActive: true }
      },
      include: {
        program: { select: { title: true } }
      }
    });
    
    // De-duplicate programs by title
    const programTitles = [...new Set(enrollments.map(e => e.program.title))];

    return {
      isLinked: true,
      daughterName: link.teen?.profile?.displayName || link.teen?.username || "Daughter",
      activeJourney,
      moodTrend: recentLogs,
      nextExpertSession: nextSession ? nextSession.scheduledAt : null,
      nextExpertSessionStatus: nextSession ? nextSession.status : null,
      programs: programTitles
    };
  }

  static async getDaughterReport(parentId: string, teenId: string) {
    const link = await prisma.parentLink.findFirst({
      where: {
        parentId,
        teenId,
        status: "LINKED"
      },
      include: {
        teen: {
          include: {
            profile: true,
            avatar: true
          }
        }
      }
    });

    if (!link || !link.teen) {
      throw new Error("Unauthorized or no linked daughter found");
    }

    const teen = link.teen;
    const displayName = teen.profile?.displayName || teen.username || "Daughter";
    const avatarUrl = teen.profile?.avatarUrl || null;
    const phone = teen.phone;

    // 1. Fetch all detailed metrics in parallel
    const [
      cycleProfile,
      recentCycleLogs,
      creativeProgresses,
      askGigiEntries,
      enrollments,
      expertSessions,
      wellnessScore,
      journalEntries,
      recentCrisisAlert
    ] = await Promise.all([
      prisma.cycleProfile.findUnique({ where: { userId: teenId } }),
      prisma.cycleLog.findMany({
        where: { userId: teenId },
        orderBy: { date: "desc" },
        take: 30
      }),
      prisma.creativeNodeProgress.findMany({
        where: { userId: teenId },
        include: {
          episode: {
            include: { journey: true }
          }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.creativeAskGigiEntry.findMany({
        where: { userId: teenId },
        include: { episode: true },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.programEnrollment.findMany({
        where: {
          OR: [{ userId: teenId }, { userId: parentId }],
          status: "ACTIVE",
          program: { isActive: true }
        },
        include: { program: true }
      }),
      prisma.expertSessionSchedule.findMany({
        where: { userId: teenId },
        include: { expert: { include: { profile: true } } },
        orderBy: { scheduledAt: "desc" },
        take: 10
      }),
      this.calculateWellnessScore(teenId),
      prisma.journalEntry.findMany({
        where: { userId: teenId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.notificationHistory.findFirst({
        where: {
          userId: parentId,
          type: "CRISIS_ALERT",
          sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { sentAt: "desc" }
      })
    ]);

    // 2. Inactivity calculation across sections
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const firstLog = recentCycleLogs[0];
    let trackerDaysInactive = 5;
    if (firstLog && firstLog.date) {
      const diffMs = now.getTime() - new Date(firstLog.date).getTime();
      trackerDaysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const firstProgress = creativeProgresses[0];
    let journeyDaysInactive = 5;
    if (firstProgress && firstProgress.updatedAt) {
      const diffMs = now.getTime() - new Date(firstProgress.updatedAt).getTime();
      journeyDaysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const firstGigi = askGigiEntries[0];
    let journalDaysInactive = 5;
    if (firstGigi && firstGigi.createdAt) {
      const diffMs = now.getTime() - new Date(firstGigi.createdAt).getTime();
      journalDaysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const firstSession = expertSessions.find(s => s.status === "COMPLETED");
    let sessionDaysInactive: number | null = null;
    if (firstSession && firstSession.scheduledAt) {
      const diffMs = now.getTime() - new Date(firstSession.scheduledAt).getTime();
      sessionDaysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const activityDates: Date[] = [];
    if (firstLog && firstLog.date) activityDates.push(new Date(firstLog.date));
    if (firstProgress && firstProgress.updatedAt) activityDates.push(new Date(firstProgress.updatedAt));
    if (firstGigi && firstGigi.createdAt) activityDates.push(new Date(firstGigi.createdAt));
    if (journalEntries[0]?.createdAt) activityDates.push(new Date(journalEntries[0].createdAt));

    let lastActiveAt: Date | null = null;
    let daysInactive = 0;
    if (activityDates.length > 0) {
      activityDates.sort((a, b) => b.getTime() - a.getTime());
      const latest = activityDates[0];
      if (latest) {
        lastActiveAt = latest;
        const diffMs = now.getTime() - latest.getTime();
        daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    } else {
      daysInactive = 5; // Default if never logged
    }

    const isInactiveWarning = daysInactive >= 2;
    let activityStatusText = "Active today";
    if (daysInactive === 1) activityStatusText = "Active yesterday";
    else if (daysInactive >= 2) activityStatusText = `Inactive for ${daysInactive} days`;

    // Today's Live Activity
    const loggedTrackerToday = recentCycleLogs.some(l => new Date(l.date) >= todayStart);
    const completedLearningToday = creativeProgresses.some(p => new Date(p.updatedAt) >= todayStart && p.status === "COMPLETED");
    const checkinCompletedToday = askGigiEntries.some(g => new Date(g.createdAt) >= todayStart) || journalEntries.some(j => new Date(j.createdAt) >= todayStart);

    const todayActivity = {
      loggedTrackerToday,
      completedLearningToday,
      checkinCompletedToday,
      hasAnyActivityToday: loggedTrackerToday || completedLearningToday || checkinCompletedToday
    };

    // 3. Menstrual & Cycle Data (with period countdown, late period detection, and AI insight)
    let daysUntilNextPeriod: number | null = null;
    let isPeriodLate = false;
    let daysLate = 0;

    let expectedPeriodStart: Date | null = null;
    if (cycleProfile?.predictedNextStart) {
      expectedPeriodStart = new Date(cycleProfile.predictedNextStart);
    } else if (cycleProfile?.lastPeriodStart) {
      const avgLen = cycleProfile.avgCycleLength || 28;
      expectedPeriodStart = new Date(new Date(cycleProfile.lastPeriodStart).getTime() + avgLen * 24 * 60 * 60 * 1000);
    }

    if (expectedPeriodStart) {
      const diffMs = expectedPeriodStart.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        isPeriodLate = true;
        daysLate = Math.abs(diffDays);
        daysUntilNextPeriod = 0;
      } else {
        isPeriodLate = false;
        daysLate = 0;
        daysUntilNextPeriod = diffDays;
      }
    }

    const phase = (cycleProfile?.currentPhase || "watching_waiting").toLowerCase();
    let aiCycleInsight = "She is in a steady cycle phase. Tracking consistently ensures accurate forecasts.";
    if (isPeriodLate) {
      aiCycleInsight = `Her period is approximately ${daysLate} ${daysLate === 1 ? 'day' : 'days'} late based on previous cycle patterns. In teenage years, occasional cycle delays due to exams, growth, stress, or mild fatigue are normal. Encourage her to log if her period started.`;
    } else if (phase.includes("menstrual") || phase.includes("period")) {
      aiCycleInsight = "Her period is active right now. Rest, hydration, and warmth are recommended.";
    } else if (phase.includes("luteal") || phase.includes("pms")) {
      if (daysUntilNextPeriod !== null && daysUntilNextPeriod > 0) {
        aiCycleInsight = `Her period is predicted in approximately ${daysUntilNextPeriod} days. Pre-menstrual mood changes or mild cramps may appear.`;
      } else if (daysUntilNextPeriod === 0) {
        aiCycleInsight = "Her period is expected today or within the next 24 hours. Keep supplies and comfort items accessible.";
      } else {
        aiCycleInsight = "She is in her Luteal phase. Mood sensitivity or energy shifts are typical.";
      }
    } else if (phase.includes("ovulation")) {
      aiCycleInsight = "Mid-cycle ovulation phase. Confidence, social energy, and focus are usually at peak.";
    } else if (phase.includes("follicular")) {
      aiCycleInsight = "Post-period follicular renewal. Estrogen is rising, supporting high stamina and creativity.";
    }

    let trackerStatusMessage = "Logged today in period tracker ✅";
    if (trackerDaysInactive === 1) {
      trackerStatusMessage = "Not logged today (last log yesterday)";
    } else if (trackerDaysInactive >= 2) {
      trackerStatusMessage = `Not logged in period tracker for ${trackerDaysInactive} days ⚠️`;
    } else if (recentCycleLogs.length === 0) {
      trackerStatusMessage = "No cycle or period logs recorded yet ⚠️";
    }

    const cycleData = {
      trackerMode: cycleProfile?.trackerMode || "watching_waiting",
      currentPhase: cycleProfile?.currentPhase || "waiting",
      currentCycleDay: cycleProfile?.currentCycleDay || null,
      lastPeriodStart: cycleProfile?.lastPeriodStart || null,
      predictedNextStart: cycleProfile?.predictedNextStart || expectedPeriodStart || null,
      predictedNextEnd: cycleProfile?.predictedNextEnd || null,
      daysUntilNextPeriod,
      isPeriodLate,
      daysLate,
      avgCycleLength: cycleProfile?.avgCycleLength || 28,
      avgPeriodDuration: cycleProfile?.avgPeriodDuration || 5,
      currentLogStreak: cycleProfile?.currentLogStreak || 0,
      daysInactive: trackerDaysInactive,
      trackerStatusMessage,
      aiCycleInsight,
      recentLogs: recentCycleLogs.slice(0, 7).map(log => ({
        date: log.date,
        flow: log.flow,
        moodPrimary: log.moodPrimary,
        symptoms: log.symptoms,
        crampIntensity: log.crampIntensity,
        energyLevel: log.energyLevel,
        sleepHours: log.sleepHours
      }))
    };

    // 4. Learning Journey Data
    const completedNodesCount = creativeProgresses.filter(p => p.status === "COMPLETED").length;
    const todayNodesCount = creativeProgresses.filter(p => new Date(p.updatedAt) >= todayStart && p.status === "COMPLETED").length;
    const totalXpEarned = creativeProgresses.reduce((acc, curr) => acc + (curr.xpEarned || 0), 0);
    const totalCoinsEarned = creativeProgresses.reduce((acc, curr) => acc + (curr.coinsEarned || 0), 0);

    const activeProgress = creativeProgresses[0];
    let activeJourneyTitle = "Creative Journey";
    let activeEpisodeTitle = null;
    if (activeProgress && activeProgress.episode) {
      activeEpisodeTitle = activeProgress.episode.title;
      if (activeProgress.episode.journey) {
        activeJourneyTitle = activeProgress.episode.journey.title;
      }
    }

    const journeyData = {
      activeJourneyTitle,
      activeEpisodeTitle,
      completedNodesCount,
      todayNodesCount,
      totalXpEarned,
      totalCoinsEarned,
      daysInactive: journeyDaysInactive,
      lastNodeCompletedAt: activeProgress?.updatedAt || null
    };

    // 5. Course / Programs & Sessions
    const uniquePrograms = Array.from(new Set(enrollments.map(e => e.program.title)));
    const upcomingSessions = expertSessions.filter(s => new Date(s.scheduledAt) >= new Date() && (s.status === "SCHEDULED" || s.status === "RESCHEDULED"));
    const completedSessionsCount = expertSessions.filter(s => s.status === "COMPLETED").length;
    const nextSession = upcomingSessions.length > 0 ? upcomingSessions[0] : null;

    const programData = {
      enrolledPrograms: uniquePrograms,
      totalCompletedSessions: completedSessionsCount,
      daysInactive: sessionDaysInactive,
      nextSession: nextSession ? {
        scheduledAt: nextSession.scheduledAt,
        status: nextSession.status,
        expertName: nextSession.expert?.profile?.displayName || nextSession.expert?.username || "Infano Specialist"
      } : null
    };

    // 6. Mood Breakdown & Trends (Last 30 days)
    const moodCounts: Record<string, number> = {};
    let totalMoodLogs = 0;
    for (const log of recentCycleLogs) {
      if (log.moodPrimary) {
        const mood = log.moodPrimary.toLowerCase();
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        totalMoodLogs++;
      }
    }

    let topMood = "Balanced";
    let maxCount = 0;
    for (const [m, count] of Object.entries(moodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topMood = m;
      }
    }

    let aiMoodInsight = "Her mood has been stable with regular check-ins.";
    if (totalMoodLogs > 0) {
      if (topMood === "happy" || topMood === "great") {
        aiMoodInsight = `Predominantly joyful and upbeat over the past ${totalMoodLogs} logs (${Math.round((maxCount / totalMoodLogs) * 100)}% Happy).`;
      } else if (topMood === "calm" || topMood === "relaxed") {
        aiMoodInsight = `Maintaining a calm, grounded emotional state across recent days.`;
      } else if (topMood === "tired" || topMood === "exhausted") {
        aiMoodInsight = `Frequent fatigue or lower energy noted. Ensure balanced sleep and light physical recovery.`;
      } else if (topMood === "anxious" || topMood === "sad" || topMood === "irritable") {
        aiMoodInsight = `Elevated sensitivity or stress reported recently. Warm, low-pressure conversations are suggested.`;
      }
    }

    const moodData = {
      moodCounts,
      totalMoodLogs,
      topMood,
      aiMoodInsight,
      recentTimeline: recentCycleLogs.slice(0, 14).map(l => ({
        date: l.date,
        mood: l.moodPrimary,
        symptoms: l.symptoms,
        energy: l.energyLevel
      }))
    };

    // 7. Recent Reflections / Ask Gigi Entries
    const reflections = askGigiEntries.slice(0, 5).map(entry => ({
      id: entry.id,
      promptText: entry.episode?.title || "Journal Reflection",
      entryText: entry.entryText,
      createdAt: entry.createdAt
    }));

    // 8. Weekly Summary Card Synthesis
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const logsThisWeek = recentCycleLogs.filter(l => new Date(l.date) >= sevenDaysAgo);
    const activeNodesThisWeek = creativeProgresses.filter(p => new Date(p.updatedAt) >= sevenDaysAgo && p.status === "COMPLETED");

    let weeklyGrade = "Balanced";
    if (wellnessScore >= 80) weeklyGrade = "Thriving";
    else if (wellnessScore < 60) weeklyGrade = "Needs Care";

    const highlights: string[] = [];
    if (logsThisWeek.length > 0) {
      highlights.push(`Logged health & mood on ${logsThisWeek.length} of the last 7 days`);
    } else {
      highlights.push(`No health logs recorded this week`);
    }

    if (activeNodesThisWeek.length > 0) {
      highlights.push(`Completed ${activeNodesThisWeek.length} learning modules`);
    }

    if (nextSession) {
      highlights.push(`Upcoming expert session scheduled for ${new Date(nextSession.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
    } else if (completedSessionsCount > 0) {
      highlights.push(`Completed ${completedSessionsCount} guidance sessions to date`);
    }

    // Actionable Parenting Tip based on current phase and mood
    let parentTip = "Offer a listening ear and gentle encouragement this week to support her routines.";
    const currentPhaseLower = (cycleProfile?.currentPhase || "").toLowerCase();
    if (isPeriodLate) {
      parentTip = `Her period is currently ${daysLate} ${daysLate === 1 ? 'day' : 'days'} late. Stress or school fatigue can delay teen cycles. Keep a warm, supportive atmosphere and remind her to track symptoms.`;
    } else if (currentPhaseLower.includes("luteal") || currentPhaseLower.includes("pms")) {
      parentTip = "She may experience mood fluctuations or lower energy. Warm teas, low-pressure conversations, and rest will support her well.";
    } else if (currentPhaseLower.includes("menstrual") || currentPhaseLower.includes("period")) {
      parentTip = "Her body is recharging. Hydration, balanced warm meals, and plenty of rest are especially helpful right now.";
    } else if (currentPhaseLower.includes("follicular") || currentPhaseLower.includes("ovulation")) {
      parentTip = "Energy and confidence are typically elevated. This is a great time to encourage new goals, hobbies, and family activities.";
    }

    const weeklySummary = {
      weeklyGrade,
      activeDaysThisWeek: logsThisWeek.length,
      wellnessScore,
      highlights,
      parentTip,
      generatedAt: new Date()
    };

    return {
      teenId,
      displayName,
      avatarUrl,
      phone,
      wellnessScore,
      activityStatus: {
        daysInactive,
        isInactiveWarning,
        statusText: activityStatusText,
        lastActiveAt
      },
      todayActivity,
      cycleData,
      journeyData,
      programData,
      moodData,
      reflections,
      weeklySummary,
      recentCrisisAlert: recentCrisisAlert ? {
        title: recentCrisisAlert.title,
        body: recentCrisisAlert.body,
        sentAt: recentCrisisAlert.sentAt
      } : null
    };
  }

  // --- Expert Session Methods ---

  static async getExpertSlots(expertId: string) {
    const expert = await prisma.user.findUnique({
      where: { id: expertId },
      include: { calendarSettings: true }
    });
    
    if (!expert || expert.role !== 'EXPERT') {
      throw new Error("Expert not found");
    }

    const settings = expert.calendarSettings || {
      timezone: "Asia/Kolkata",
      reschedulePolicy: "24 hours prior",
      bookingPeriodMonths: 2,
      defaultAvailability: {},
      blockDates: []
    };

    const slots: string[] = [];
    const now = new Date();
    // Generate up to bookingPeriodMonths
    const maxDays = (settings.bookingPeriodMonths || 2) * 30;
    
    for (let i = 1; i <= maxDays; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateString = date.toISOString().split('T')[0] || "";
      
      const blockDates = (settings.blockDates as string[]) || [];
      if (blockDates.includes(dateString)) {
        continue;
      }

      const defaultAvailability = (settings.defaultAvailability as Record<string, {start: string, end: string}[]>) || {};
      const daySlots = defaultAvailability[dayName];
      if (daySlots && Array.isArray(daySlots)) {
        for (const slot of daySlots) {
           const startParts = (slot.start || "00:00").split(':');
           const endParts = (slot.end || "00:00").split(':');
           let currentHour = parseInt(startParts[0] || "0");
           let endHour = parseInt(endParts[0] || "0");
           
           while (currentHour < endHour) {
             const slotTime = new Date(date);
             slotTime.setHours(currentHour, parseInt(startParts[1] || "0"), 0, 0);
             slots.push(slotTime.toISOString());
             currentHour++;
           }
        }
      }
    }

    const bookedSessions = await prisma.expertSessionSchedule.findMany({
      where: {
        expertId: expertId,
        scheduledAt: { gte: now }
      },
      select: { scheduledAt: true }
    });
    const bookedTimes = bookedSessions.map(s => s.scheduledAt.toISOString());
    const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));
    
    return {
      settings: {
        timezone: settings.timezone,
        reschedulePolicy: settings.reschedulePolicy,
        bookingPeriodMonths: settings.bookingPeriodMonths
      },
      availableSlots
    };
  }
  static async getExperts(specialisation?: string) {
    const whereClause: any = { role: "EXPERT" };
    if (specialisation) {
      whereClause.profile = { specialisation: { contains: specialisation, mode: "insensitive" } };
    }
    
    const experts = await prisma.user.findMany({
      where: whereClause,
      include: { profile: true }
    });
    
    return experts.map(expert => ({
      id: expert.id,
      displayName: expert.profile?.displayName || expert.username,
      specialisation: expert.profile?.specialisation || "General Expert",
      consultationPrice: expert.profile?.consultationPrice || 500,
      avatarUrl: expert.profile?.userId, // mock photo handling
      availableSlots: ["2026-06-01T10:00:00Z", "2026-06-02T14:00:00Z"] // mock available slots
    }));
  }

  static async bookExpertSession(userId: string, expertId: string, scheduledAt: string) {
    const expert = await prisma.user.findUnique({
      where: { id: expertId },
      include: { profile: true }
    });
    if (!expert) throw new Error("Expert not found");

    const price = expert.profile?.consultationPrice || 500;
    
    const options = {
      amount: Math.round(price * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}_expert`,
    };
    
    const order = await razorpay.orders.create(options);
    
    // Instead of creating a DB order, we return the Razorpay order 
    // to the frontend, and handle schedule creation in verify
    return {
      razorpayOrderId: order.id,
      amount: options.amount,
      currency: options.currency,
      expertId,
      scheduledAt,
      razorpayKeyId: env.RAZORPAY_KEY_ID || ""
    };
  }

  static async verifyExpertSessionPayment(userId: string, data: {
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    expertId: string,
    scheduledAt: Date
  }) {
    if (env.RAZORPAY_KEY_SECRET) {
      const body = data.razorpayOrderId + "|" + data.razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== data.razorpaySignature) {
        throw new Error("Payment verification failed: Invalid signature");
      }
    }

    // Determine teenId if the user is a parent booking for teen
    const parentBookingLink = await prisma.parentLink.findFirst({
      where: { parentId: userId, status: "LINKED" }
    });

    const targetUserId = parentBookingLink && parentBookingLink.teenId ? parentBookingLink.teenId : userId;

    // Find general linkage for notifying parent/teen
    const link = await prisma.parentLink.findFirst({
      where: {
        OR: [
          { teenId: targetUserId },
          { parentId: targetUserId }
        ],
        status: "LINKED"
      }
    });

    // Retrieve expert to check session price
    const expert = await prisma.user.findUnique({
      where: { id: data.expertId },
      include: { profile: true }
    });
    const price = expert?.profile?.consultationPrice || 500;

    const schedule = await prisma.expertSessionSchedule.create({
      data: {
        userId: targetUserId,
        expertId: data.expertId,
        scheduledAt: data.scheduledAt,
        status: "SCHEDULED",
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
        amount: price
      }
    });

    try {
      const expertName = expert?.profile?.displayName || expert?.username || "Expert";
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { profile: true }
      });
      const userName = targetUser?.profile?.displayName || targetUser?.username || "User";
      const formattedDate = new Date(data.scheduledAt).toLocaleString();

      // 1. Notify User/Teen
      const userTitle = "Expert Session Scheduled";
      const userBody = `Your session with ${expertName} is scheduled for ${formattedDate}.`;
      const deepLink = `infano://expert/chat/${schedule.id}`;

      await prisma.notificationHistory.create({
        data: {
          userId: targetUserId,
          type: "sessionScheduled",
          title: userTitle,
          body: userBody,
          deepLink,
          sentAt: new Date()
        }
      });

      if (targetUser?.fcmToken) {
        try {
          await FirebaseService.sendPushNotification(targetUser.fcmToken, {
            title: userTitle,
            body: userBody,
            deepLink,
            data: { notificationType: "sessionScheduled", sessionId: schedule.id }
          });
        } catch (err) {
          console.error("Failed to send push notification to user for scheduled session:", err);
        }
      }

      // 2. Notify Linked Partner if linked
      if (link) {
        const partnerId = targetUserId === link.teenId ? link.parentId : link.teenId;
        if (partnerId) {
          const partnerUser = await prisma.user.findUnique({
            where: { id: partnerId }
          });
          const parentBody = `The session for ${userName} with ${expertName} is scheduled for ${formattedDate}.`;

          await prisma.notificationHistory.create({
            data: {
              userId: partnerId,
              type: "sessionScheduled",
              title: userTitle,
              body: parentBody,
              deepLink,
              sentAt: new Date()
            }
          });

          if (partnerUser?.fcmToken) {
            try {
              await FirebaseService.sendPushNotification(partnerUser.fcmToken, {
                title: userTitle,
                body: parentBody,
                deepLink,
                data: { notificationType: "sessionScheduled", sessionId: schedule.id }
              });
            } catch (err) {
              console.error("Failed to send push notification to partner for scheduled session:", err);
            }
          }
        }
      }

      // 3. Notify Expert
      const expertTitle = "New Session Booked";
      const expertBody = `A new session with ${userName} has been booked for ${formattedDate}.`;

      await prisma.notificationHistory.create({
        data: {
          userId: data.expertId,
          type: "sessionScheduled",
          title: expertTitle,
          body: expertBody,
          deepLink,
          sentAt: new Date()
        }
      });

      if (expert?.fcmToken) {
        try {
          await FirebaseService.sendPushNotification(expert.fcmToken, {
            title: expertTitle,
            body: expertBody,
            deepLink,
            data: { notificationType: "sessionScheduled", sessionId: schedule.id }
          });
        } catch (err) {
          console.error("Failed to send push notification to expert for scheduled session:", err);
        }
      }
    } catch (err) {
      console.error("Failed to send notifications for scheduled session:", err);
    }

    return schedule;
  }

  static async getExpertSessions(userId: string) {
    const link = await prisma.parentLink.findFirst({
      where: { parentId: userId, status: "LINKED" }
    });
    
    const targetUserId = link && link.teenId ? link.teenId : userId;
    
    return prisma.expertSessionSchedule.findMany({
      where: { userId: targetUserId },
      include: {
        expert: { include: { profile: true } }
      },
      orderBy: { scheduledAt: "desc" }
    });
  }

  static async cancelExpertSession(userId: string, sessionId: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");

    const link = await prisma.parentLink.findFirst({ where: { parentId: userId, status: "LINKED" }});
    const validUserIds = [userId];
    if (link && link.teenId) validUserIds.push(link.teenId);

    if (!session.userId || !validUserIds.includes(session.userId)) {
      throw new Error("Unauthorized to cancel this session");
    }

    const hoursUntil = (session.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 6) {
      throw new Error("Cannot cancel session within 6 hours of scheduled time");
    }

    const cancelled = await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: { status: "CANCELLED" }
    });

    // Notify Expert (simulated via log — no NotificationHistory model yet)
    console.log(`[Notification] Expert ${session.expertId}: Session on ${session.scheduledAt.toLocaleString()} was cancelled by parent.`);

    return cancelled;
  }

  static async rescheduleExpertSession(userId: string, sessionId: string, newScheduledAt: Date) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");

    if (!session.userId) {
      throw new Error("Cannot reschedule batch session individually");
    }

    const link = await prisma.parentLink.findFirst({
      where: {
        OR: [
          { teenId: session.userId },
          { parentId: session.userId }
        ],
        status: "LINKED"
      }
    });
    const validUserIds = [session.userId];
    if (link && link.parentId) validUserIds.push(link.parentId);

    if (!validUserIds.includes(userId)) {
      throw new Error("Unauthorized to reschedule this session");
    }

    const hoursUntil = (session.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 6) {
      throw new Error("Cannot reschedule session within 6 hours of original time");
    }

    const rescheduled = await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: { scheduledAt: newScheduledAt }
    });

    try {
      // Fetch expert details
      const expert = await prisma.user.findUnique({
        where: { id: session.expertId },
        include: { profile: true }
      });
      const expertName = expert?.profile?.displayName || expert?.username || "Expert";

      // Fetch user details
      const targetUser = session.userId ? await prisma.user.findUnique({
        where: { id: session.userId },
        include: { profile: true }
      }) : null;
      const userName = targetUser?.profile?.displayName || targetUser?.username || "User";

      // Formatted date-time
      const formattedDate = new Date(newScheduledAt).toLocaleString();

      const userTitle = "Expert Session Rescheduled";
      const userBody = `Your session with ${expertName} has been rescheduled to ${formattedDate}.`;
      const deepLink = `infano://expert/chat/${sessionId}`;

      // 1. Notify User/Teen
      if (session.userId) {
        await prisma.notificationHistory.create({
          data: {
            userId: session.userId,
            type: "sessionRescheduled",
            title: userTitle,
            body: userBody,
            deepLink,
            sentAt: new Date()
          }
        });
      }

      if (targetUser?.fcmToken) {
        try {
          await FirebaseService.sendPushNotification(targetUser.fcmToken, {
            title: userTitle,
            body: userBody,
            deepLink,
            data: { notificationType: "sessionRescheduled", sessionId }
          });
        } catch (err) {
          console.error("Failed to send push notification to user for rescheduled session:", err);
        }
      }

      // 2. Notify Linked Partner if link exists
      if (link) {
        const partnerId = session.userId === link.teenId ? link.parentId : link.teenId;
        if (partnerId) {
          const partnerUser = await prisma.user.findUnique({
            where: { id: partnerId }
          });
          const parentBody = `The session for ${userName} with ${expertName} has been rescheduled to ${formattedDate}.`;

          await prisma.notificationHistory.create({
            data: {
              userId: partnerId,
              type: "sessionRescheduled",
              title: userTitle,
              body: parentBody,
              deepLink,
              sentAt: new Date()
            }
          });

          if (partnerUser?.fcmToken) {
            try {
              await FirebaseService.sendPushNotification(partnerUser.fcmToken, {
                title: userTitle,
                body: parentBody,
                deepLink,
                data: { notificationType: "sessionRescheduled", sessionId }
              });
            } catch (err) {
              console.error("Failed to send push notification to partner for rescheduled session:", err);
            }
          }
        }
      }

      // 3. Notify Expert
      const expertTitle = "Session Rescheduled";
      const expertBody = `Your session with ${userName} has been rescheduled to ${formattedDate}.`;

      await prisma.notificationHistory.create({
        data: {
          userId: session.expertId,
          type: "sessionRescheduled",
          title: expertTitle,
          body: expertBody,
          deepLink,
          sentAt: new Date()
        }
      });

      if (expert?.fcmToken) {
        try {
          await FirebaseService.sendPushNotification(expert.fcmToken, {
            title: expertTitle,
            body: expertBody,
            deepLink,
            data: { notificationType: "sessionRescheduled", sessionId }
          });
        } catch (err) {
          console.error("Failed to send push notification to expert for rescheduled session:", err);
        }
      }
    } catch (err) {
      console.error("Failed to send notifications for rescheduled session:", err);
    }

    return rescheduled;
  }

  // --- Resource Library Methods ---

  static async getResources(categoryId?: string) {
    // We filter by published and non-deleted posts
    const whereClause: any = { isPublished: true, isDeleted: false };
    if (categoryId) {
      whereClause.tags = { has: categoryId };
    }
    
    return prisma.blogPost.findMany({
      where: whereClause,
      include: {
        categories: true,
        author: true
      },
      orderBy: { publishedAt: "desc" }
    });
  }

  static async bookmarkResource(userId: string, postId: string) {
    return prisma.articleBookmark.create({
      data: {
        userId,
        postId
      }
    });
  }

  static async unbookmarkResource(userId: string, postId: string) {
    return prisma.articleBookmark.deleteMany({
      where: {
        userId,
        postId
      }
    });
  }

  static async getBookmarks(userId: string) {
    const bookmarks = await prisma.articleBookmark.findMany({
      where: { userId },
      include: {
        post: {
          include: { categories: true, author: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return bookmarks.map(b => b.post);
  }

  static async getTeenParentBookmarks(teenId: string) {
    // Find the linked parent(s)
    const links = await prisma.parentLink.findMany({
      where: { teenId, status: "LINKED" }
    });

    if (!links.length) return [];

    const parentIds = links.map(l => l.parentId).filter(Boolean) as string[];
    
    const bookmarks = await prisma.articleBookmark.findMany({
      where: { userId: { in: parentIds } },
      include: {
        post: {
          include: { categories: true, author: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Deduplicate in case multiple parents bookmarked the same article
    const uniquePosts = new Map();
    for (const b of bookmarks) {
      if (!uniquePosts.has(b.postId)) {
        uniquePosts.set(b.postId, b.post);
      }
    }

    return Array.from(uniquePosts.values());
  }

  static async getNotifications(userId: string) {
    try {
      // 1. Check for latest WeeklyChallenge
      const latestChallenge = await prisma.weeklyChallenge.findFirst({
        orderBy: { startDate: "desc" }
      });

      // 2. Check for latest published BlogPost
      const latestPost = await prisma.blogPost.findFirst({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" }
      });

      // 3. Check for linked teen inactivity
      const parentLinks = await prisma.parentLink.findMany({
        where: { parentId: userId, status: "LINKED" },
        include: { teen: { include: { profile: true } } }
      });
      for (const link of parentLinks) {
        if (link.teen) {
          const inactiveDuration = Date.now() - link.teen.updatedAt.getTime();
          if (inactiveDuration >= 7 * 24 * 60 * 60 * 1000) {
            const teenName = link.teen.profile?.displayName || "your daughter";
            const existing = await prisma.notificationHistory.findFirst({
              where: { userId, type: "inactivityAlert", body: { contains: teenName } }
            });
            if (!existing) {
              await prisma.notificationHistory.create({
                data: {
                  userId,
                  type: "inactivityAlert",
                  title: "daughter inactivity alert",
                  body: `${teenName} has not logged in for 7 days. consider starting a conversation.`,
                  sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
                }
              });
            }
          }
        }
      }

      // 4. Check for upcoming expert sessions for user OR their linked partner
      const link = await prisma.parentLink.findFirst({
        where: {
          OR: [
            { teenId: userId },
            { parentId: userId }
          ],
          status: "LINKED"
        }
      });

      const partnerId = link ? (userId === link.teenId ? link.parentId : link.teenId) : null;
      const targetUserIds = [userId];
      if (partnerId) targetUserIds.push(partnerId);

      const sessions = await prisma.expertSessionSchedule.findMany({
        where: {
          userId: { in: targetUserIds },
          status: "SCHEDULED",
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // within next 24 hours
          }
        },
        include: { program: true }
      });
      for (const session of sessions) {
        const durationMs = session.scheduledAt.getTime() - Date.now();
        const hoursLeft = Math.ceil(durationMs / (60 * 60 * 1000));
        const programTitle = session.program?.title ? session.program.title.toLowerCase() : "expert session";
        
        let alertBody = "";
        if (session.userId === userId) {
          alertBody = `reminder: expert session for program '${programTitle}' starts in ${hoursLeft} hours.`;
        } else if (session.userId) {
          const targetUser = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { profile: true }
          });
          const targetUserName = targetUser?.profile?.displayName || targetUser?.username || "your family member";
          alertBody = `reminder: expert session for ${targetUserName} of program '${programTitle}' starts in ${hoursLeft} hours.`;
        } else {
          alertBody = `reminder: expert session for program '${programTitle}' starts in ${hoursLeft} hours.`;
        }
        
        const existing = await prisma.notificationHistory.findFirst({
          where: { userId, type: "upcomingSessions", body: { contains: programTitle } }
        });
        if (!existing) {
          await prisma.notificationHistory.create({
            data: {
              userId,
              type: "upcomingSessions",
              title: "upcoming expert session",
              body: alertBody,
              sentAt: new Date()
            }
          });
        }
      }

      // 5. Generate weekly challenge prompt notification
      if (latestChallenge) {
        const themeLower = latestChallenge.theme.toLowerCase();
        const existing = await prisma.notificationHistory.findFirst({
          where: { userId, type: "weeklyPrompt", body: { contains: themeLower } }
        });
        if (!existing) {
          await prisma.notificationHistory.create({
            data: {
              userId,
              type: "weeklyPrompt",
              title: "new weekly prompt",
              body: `fresh conversation starter: '${themeLower}' is now active.`,
              sentAt: latestChallenge.createdAt
            }
          });
        }
      }

      // 6. Generate blog post notification
      if (latestPost) {
        const titleLower = latestPost.title.toLowerCase();
        const existing = await prisma.notificationHistory.findFirst({
          where: { userId, type: "newResource", body: { contains: titleLower } }
        });
        if (!existing) {
          await prisma.notificationHistory.create({
            data: {
              userId,
              type: "newResource",
              title: "new library resource",
              body: `expert article: '${titleLower}' has been added to the library.`,
              sentAt: latestPost.createdAt
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to generate real database notifications:', err);
    }

    // Return all active (un-dismissed) notifications
    return await prisma.notificationHistory.findMany({
      where: {
        userId,
        openedAt: null
      },
      orderBy: { sentAt: "desc" }
    });
  }

  static async dismissNotification(userId: string, id: string) {
    return prisma.notificationHistory.updateMany({
      where: {
        id,
        userId
      },
      data: {
        openedAt: new Date()
      }
    });
  }

  static async clearAllNotifications(userId: string) {
    return prisma.notificationHistory.updateMany({
      where: {
        userId,
        openedAt: null
      },
      data: {
        openedAt: new Date()
      }
    });
  }

  static async findOrCreateUserForPublicBooking(phone: string, email: string, name: string) {
    const { normalizePhone } = await import("../../common/utils/phone.js");
    const normalizedPhone = normalizePhone(phone);

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: phone }
        ]
      },
      include: { profile: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          email: email || null,
          role: "TEEN",
          accountStatus: "PENDING_SETUP",
          profile: {
            create: {
              displayName: name || "Guest User"
            }
          }
        },
        include: { profile: true }
      });
    } else if (email && !user.email) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email },
        include: { profile: true }
      });
    }

    return user;
  }

  static async bookPublicExpertSession(data: { expertId: string; scheduledAt: string; name: string; phone: string; email: string; }) {
    if (!data.expertId || !data.scheduledAt || !data.name || !data.phone || !data.email) {
      throw new Error("Missing required fields for booking (expertId, scheduledAt, name, phone, email)");
    }
    
    const user = await this.findOrCreateUserForPublicBooking(data.phone, data.email, data.name);
    
    const expert = await prisma.user.findUnique({
      where: { id: data.expertId },
      include: { profile: true }
    });
    if (!expert) throw new Error("Expert not found");

    const price = expert.profile?.consultationPrice || 500;
    
    const options = {
      amount: Math.round(price * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}_expert`,
    };
    
    const order = await razorpay.orders.create(options);
    
    return {
      razorpayOrderId: order.id,
      amount: options.amount,
      currency: options.currency,
      expertId: data.expertId,
      scheduledAt: data.scheduledAt,
      userId: user.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID || ""
    };
  }

  static async verifyPublicExpertSessionPayment(data: {
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    expertId: string,
    scheduledAt: Date,
    name: string,
    phone: string,
    email: string
  }) {
    if (!data.expertId || !data.scheduledAt || !data.name || !data.phone || !data.email) {
      throw new Error("Missing required fields for verification (expertId, scheduledAt, name, phone, email)");
    }

    const user = await this.findOrCreateUserForPublicBooking(data.phone, data.email, data.name);

    return this.verifyExpertSessionPayment(user.id, {
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
      expertId: data.expertId,
      scheduledAt: data.scheduledAt
    });
  }

  /**
   * Notifies linked parents when a teen daughter triggers a crisis/distress event (in chat or journal)
   */
  static async notifyParentOfCrisis(teenId: string, source: "chat" | "journal" | "peerline", details?: { category?: string }) {
    try {
      const links = await prisma.parentLink.findMany({
        where: { teenId, status: "LINKED" },
        include: {
          parent: { include: { profile: true } },
          teen: { include: { profile: true } }
        }
      });

      if (!links.length) return;

      const teen = links[0]?.teen;
      const teenName = teen?.profile?.displayName || teen?.username || "Your daughter";

      // Rate limiting: max 1 alert per 4 hours to avoid overwhelm
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

      for (const link of links) {
        if (!link.parent || !link.parentId) continue;

        const parent = link.parent;
        const recentAlert = await prisma.notificationHistory.findFirst({
          where: {
            userId: parent.id,
            type: "DAUGHTER_CRISIS_ALERT",
            sentAt: { gte: fourHoursAgo }
          }
        });

        if (recentAlert) continue;

        const title = `💜 Sensitive Alert: Check in with ${teenName}`;
        const sourceLabel = source === "journal" 
          ? "logged a difficult emotional reflection in her journal"
          : "expressed feelings of sadness or emotional distress in the app";
        const body = `${teenName} recently ${sourceLabel}. Consider reaching out with a gentle, supportive check-in.`;
        const deepLink = "infano://account/family";

        // 1. In-App Notification Record
        await prisma.notificationHistory.create({
          data: {
            userId: parent.id,
            type: "DAUGHTER_CRISIS_ALERT",
            title,
            body,
            deepLink,
            payload: { teenId, source, details: details || {} },
            sentAt: new Date()
          }
        });

        // 2. Firebase Push Notification
        if (parent.fcmToken) {
          try {
            await FirebaseService.sendPushNotification(parent.fcmToken, {
              title,
              body,
              deepLink,
              data: {
                notificationType: "DAUGHTER_CRISIS_ALERT",
                teenId,
                source
              }
            });
          } catch (pushErr) {
            console.error("Failed to send crisis alert push to parent:", pushErr);
          }
        }

        // 3. SMS Alert for critical chat distress
        if (parent.phone && source !== "journal") {
          try {
            await smsProvider.sendAlert(
              parent.phone,
              `Infano Care: ${teenName} recently expressed feelings of emotional distress in the app. Please check in with her with a gentle, supportive conversation. 💙`
            );
          } catch (smsErr) {
            console.error("Failed to send crisis SMS to parent:", smsErr);
          }
        }
      }
    } catch (err) {
      console.error("Failed to process parent crisis alert:", err);
    }
  }
}
