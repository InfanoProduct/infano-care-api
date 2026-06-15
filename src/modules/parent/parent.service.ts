import { prisma } from "../../db/client.js";
import { normalizePhone } from "../../common/utils/phone.js";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "rzp_test_mock",
  key_secret: env.RAZORPAY_KEY_SECRET || "mock_secret",
});

export class ParentService {
  static async invite(senderId: string, rawReceiverPhone: string) {
    const receiverPhone = normalizePhone(rawReceiverPhone);
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) throw new Error("Sender not found");

    if (receiverPhone === "1234567890") {
      // Bypass logic for test account
      let testUser = await prisma.user.findUnique({ where: { phone: receiverPhone } });
      if (!testUser) {
        testUser = await prisma.user.create({
          data: {
            phone: receiverPhone,
            role: "TEEN",
            accountStatus: "ACTIVE",
            profile: {
              create: {
                displayName: "Test Daughter",
                totalPoints: 0,
              }
            }
          }
        });
      }

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
      await prisma.notificationHistory.create({
        data: {
          userId: link.senderId,
          type: "linkDeclined",
          title: "Link Request Declined",
          body: `${declinerName} has declined your account linking request.`,
          sentAt: new Date()
        }
      });
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
    await prisma.notificationHistory.create({
      data: {
        userId: link.senderId,
        type: "linkAcceptance",
        title: "Link Request Accepted",
        body: `${accepterName} has accepted your account linking request.`,
        sentAt: new Date()
      }
    });

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
        teen: true
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
        percentComplete
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
        status: "SCHEDULED"
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
      daughterName: link.teen?.username || "Daughter",
      activeJourney,
      moodTrend: recentLogs,
      nextExpertSession: nextSession ? nextSession.scheduledAt : null,
      programs: programTitles
    };
  }

  // --- Expert Session Methods ---

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
      sessionPrice: expert.profile?.sessionPrice || 500,
      avatarUrl: expert.profile?.userId, // mock photo handling
      availableSlots: ["2026-06-01T10:00:00Z", "2026-06-02T14:00:00Z"] // mock available slots
    }));
  }

  static async bookExpertSession(userId: string, expertId: string, scheduledAt: string) {
    const expert = await prisma.user.findUnique({
      where: { id: expertId, role: "EXPERT" },
      include: { profile: true }
    });
    if (!expert) throw new Error("Expert not found");

    const price = expert.profile?.sessionPrice || 500;
    
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
    const link = await prisma.parentLink.findFirst({
      where: { parentId: userId, status: "LINKED" }
    });
    
    const schedule = await prisma.expertSessionSchedule.create({
      data: {
        userId: link && link.teenId ? link.teenId : userId, // Book for teen if linked
        expertId: data.expertId,
        scheduledAt: data.scheduledAt,
        status: "SCHEDULED"
        // meetLink is intentionally null here — admin or expert will set it after booking
      }
    });

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

    const link = await prisma.parentLink.findFirst({ where: { parentId: userId, status: "LINKED" }});
    const validUserIds = [userId];
    if (link && link.teenId) validUserIds.push(link.teenId);

    if (!validUserIds.includes(session.userId)) {
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

    // Notify Expert (simulated via log — no NotificationHistory model yet)
    console.log(`[Notification] Expert ${session.expertId}: Session rescheduled to ${newScheduledAt.toLocaleString()} by parent.`);

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

      // 4. Check for upcoming expert sessions
      const sessions = await prisma.expertSessionSchedule.findMany({
        where: {
          userId,
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
        const alertBody = `reminder: expert session for program '${programTitle}' starts in ${hoursLeft} hours.`;
        
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
