import { prisma } from "../../db/client.js";
import { normalizePhone } from "../../common/utils/phone.js";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import crypto from "crypto";
import { FirebaseService } from "../../common/services/firebase.service.js";

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

    let testUser = await prisma.user.findUnique({ where: { phone: receiverPhone } });
    if (testUser?.isTestNumber) {
      // Bypass logic for test account

      const existing = await prisma.parentLink.findUnique({
        where: { senderId_receiverPhone: { senderId, receiverPhone } }
      });

      if (existing) {
        return await prisma.parentLink.update({
          where: { id: existing.id },
          data: { status: "LINKED" }
        });
      }

      const pId = sender.role === "PARENT" ? sender.id : testUser.id;
      const tId = sender.role === "PARENT" ? testUser.id : sender.id;

      return await prisma.parentLink.create({
        data: {
          senderId,
          receiverPhone,
          status: "LINKED",
          parentId: pId,
          teenId: tId
        }
      });
    }

    const receiver = await prisma.user.findUnique({ where: { phone: receiverPhone } });
    if (!receiver) {
      throw new Error("USER_NOT_FOUND");
    }

    let parentId = null;
    let teenId = null;
    if (sender.role === "PARENT" || sender.role === "GUARDIAN") {
      parentId = sender.id;
      teenId = receiver.id;
    } else if (sender.role === "TEEN") {
      teenId = sender.id;
      parentId = receiver.id;
    } else {
      parentId = sender.id;
      teenId = receiver.id;
    }

    const existing = await prisma.parentLink.findUnique({
      where: { senderId_receiverPhone: { senderId, receiverPhone } }
    });

    if (existing) {
      if (existing.status === "LINKED") throw new Error("Already linked");
      return existing; // Returns pending
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
    const body = `${senderName} wants to link accounts with you.`;
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
    
    return link;
  }

  static async getLinks(userId: string) {
    try {
      return await prisma.parentLink.findMany({
        where: {
          OR: [
            { senderId: userId },
            { parentId: userId },
            { teenId: userId }
          ]
        },
        include: {
          parent: { include: { profile: true } },
          teen: { include: { profile: true } },
          sender: { include: { profile: true } }
        },
        orderBy: { createdAt: "desc" }
      });
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

    const updatedLink = await prisma.parentLink.update({
      where: { id: linkId },
      data: { status: "LINKED" }
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
        console.error("Failed to send firebase push notification for link acceptance:", err);
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

    // 2. Active Journey (latest UserProgress)
    const activeProgress = await prisma.userProgress.findFirst({
      where: { 
        userId: teenId,
        episode: {
          journey: {
            slug: {
              not: "peerline-mentor-certification"
            }
          }
        }
      },
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
      // Calculate completion based on completed episodes
      const totalEpisodes = await prisma.episode.count({ where: { journeyId } });
      const completedEpisodes = await prisma.userProgress.count({
        where: {
          userId: teenId,
          episode: { journeyId },
          completed: true
        }
      });
      const percentComplete = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
      
      activeJourney = {
        name: activeProgress.episode.journey.title,
        percentComplete,
        thumbnailUrl: activeProgress.episode.journey.thumbnailUrl || activeProgress.episode.journey.bannerImage
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
      scheduledAt
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

    if (!validUserIds.includes(session.userId)) {
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
      const targetUser = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { profile: true }
      });
      const userName = targetUser?.profile?.displayName || targetUser?.username || "User";

      // Formatted date-time
      const formattedDate = new Date(newScheduledAt).toLocaleString();

      // 1. Notify User/Teen
      const userTitle = "Expert Session Rescheduled";
      const userBody = `Your session with ${expertName} has been rescheduled to ${formattedDate}.`;
      const deepLink = `infano://expert/chat/${sessionId}`;

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
        } else {
          const targetUser = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { profile: true }
          });
          const targetUserName = targetUser?.profile?.displayName || targetUser?.username || "your family member";
          alertBody = `reminder: expert session for ${targetUserName} of program '${programTitle}' starts in ${hoursLeft} hours.`;
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
}
