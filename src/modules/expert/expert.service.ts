import { prisma } from "../../db/client.js";
import { logger } from "../../config/logger.js";
import { ProgramsService } from "../programs/programs.service.js";

export class ExpertService {
  static async getEnrollments() {
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        status: "ACTIVE",
        program: { isActive: true }
      },
      include: {
        program: {
          select: { id: true, title: true }
        },
        user: {
          select: { id: true, profile: { select: { displayName: true } }, username: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Map guestName back into the user display name if it exists
    return enrollments.map(e => ({
      ...e,
      user: {
        ...e.user,
        profile: {
          ...e.user?.profile,
          displayName: e.guestName || e.user?.profile?.displayName || e.user?.username
        }
      }
    }));
  }

  static async getCalendarSettings(expertId: string) {
    const settings = await prisma.expertCalendarSettings.findUnique({
      where: { userId: expertId }
    });
    return settings;
  }

  static async updateCalendarSettings(expertId: string, data: any) {
    const settings = await prisma.expertCalendarSettings.upsert({
      where: { userId: expertId },
      update: {
        timezone: data.timezone,
        reschedulePolicy: data.reschedulePolicy,
        bookingPeriodMonths: data.bookingPeriodMonths,
        defaultAvailability: data.defaultAvailability,
        blockDates: data.blockDates,
      },
      create: {
        userId: expertId,
        timezone: data.timezone || "Asia/Kolkata",
        reschedulePolicy: data.reschedulePolicy || "24 hours prior",
        bookingPeriodMonths: data.bookingPeriodMonths || 2,
        defaultAvailability: data.defaultAvailability || {},
        blockDates: data.blockDates || [],
      }
    });
    return settings;
  }

  static async getEnrollmentDetails(enrollmentId: string) {
    const enrollment = await prisma.programEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        program: {
          select: { id: true, title: true, consultations: true, curriculum: true }
        },
        batch: {
          select: { id: true, name: true, status: true, maxCapacity: true }
        },
        user: {
          select: { id: true, profile: { select: { displayName: true } }, username: true }
        }
      }
    });

    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Fetch all expert sessions for this specific user or batch and program
    const sessions = await prisma.expertSessionSchedule.findMany({
      where: {
        programId: enrollment.programId,
        OR: [
          { userId: enrollment.userId },
          ...(enrollment.batchId ? [{ batchId: enrollment.batchId }] : [])
        ]
      },
      orderBy: { sessionNumber: "asc" },
      include: {
        expert: {
          select: {
            username: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    });

    return {
      enrollment: {
        ...enrollment,
        user: {
          ...enrollment.user,
          profile: {
            ...enrollment.user?.profile,
            displayName: enrollment.guestName || enrollment.user?.profile?.displayName || enrollment.user?.username
          }
        },
        program: {
          ...enrollment.program,
          sessionsList: ProgramsService.getMockSessionsForProgram(enrollment.program.title)
        }
      },
      sessions
    };
  }

  static async getSessions(expertId: string) {
    return await prisma.expertSessionSchedule.findMany({
      where: { expertId },
      include: {
        user: { select: { username: true, profile: { select: { displayName: true } } } }
      },
      orderBy: { scheduledAt: "desc" }
    });
  }

  static async scheduleSession(expertId: string, data: { userId?: string, batchId?: string, programId: string, sessionNumber: number, meetLink: string, scheduledAt: string }) {
    if (!data.userId && !data.batchId) {
      throw new Error("Either userId or batchId must be provided to schedule a session");
    }

    const whereClause: any = {
      programId: data.programId,
      sessionNumber: data.sessionNumber
    };
    if (data.batchId) {
      whereClause.batchId = data.batchId;
    } else {
      whereClause.userId = data.userId;
    }

    // Check if this session number is already scheduled
    const existing = await prisma.expertSessionSchedule.findFirst({
      where: whereClause
    });

    if (existing) {
      // Update existing if already scheduled
      const updated = await prisma.expertSessionSchedule.update({
        where: { id: existing.id },
        data: {
          expertId,
          meetLink: data.meetLink,
          scheduledAt: new Date(data.scheduledAt),
          status: "SCHEDULED"
        }
      });
      await notifyProgramSessionEvent(updated.id, "rescheduled");
      return updated;
    }

    const created = await prisma.expertSessionSchedule.create({
      data: {
        userId: data.userId || null,
        batchId: data.batchId || null,
        expertId,
        programId: data.programId,
        sessionNumber: data.sessionNumber,
        meetLink: data.meetLink,
        scheduledAt: new Date(data.scheduledAt),
        status: "SCHEDULED"
      }
    });
    await notifyProgramSessionEvent(created.id, "scheduled");
    return created;
  }

  static async completeSession(expertId: string, sessionId: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");

    return await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" }
    });
  }

  static async updateSessionStatus(expertId: string, sessionId: string, status: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    if (session.expertId !== expertId) throw new Error("Unauthorized: this session does not belong to you");

    return await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: { status }
    });
  }

  static async updateSessionMeetLink(expertId: string, sessionId: string, meetLink: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    if (session.expertId !== expertId) throw new Error("Unauthorized: this session does not belong to you");
    return await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: { meetLink }
    });
  }

  static async rescheduleSession(expertId: string, sessionId: string, scheduledAt: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    if (session.expertId !== expertId) throw new Error("Unauthorized: this session does not belong to you");

    const updated = await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: "RESCHEDULED"
      }
    });
    await notifyProgramSessionEvent(updated.id, "rescheduled");
    return updated;
  }

  // --- RESTORED CHAT METHODS ---


  async listExperts(userId: string) {
    try {
      const experts = await prisma.user.findMany({
        where: { role: 'EXPERT' as any },
        select: {
          id: true,
          profile: {
            select: {
              displayName: true,
              pronouns: true,
            }
          },
          expertChats: {
            where: { userId },
            select: {
              id: true,
              messages: {
                where: {
                  isRead: false,
                  NOT: { senderId: userId }
                },
                select: { id: true }
              }
            }
          }
        }
      });

      return experts.map(expert => {
        const chat = expert.expertChats[0];
        return {
          id: expert.id,
          profile: expert.profile,
          unreadCount: chat ? chat.messages.length : 0
        };
      });
    } catch (error) {
      logger.error(error as any, 'Error in ExpertService.listExperts:');
      throw error;
    }
  }

  async getOrCreateSession(userId: string, expertId: string) {
    try {
      let session = await prisma.expertChatSession.findFirst({
        where: {
          OR: [
            { userId, expertId },
            { userId: expertId, expertId: userId }
          ]
        }
      });

      if (!session) {
        session = await prisma.expertChatSession.create({
          data: {
            userId,
            expertId,
            status: 'active'
          }
        });
      }

      return session;
    } catch (error) {
      logger.error(error as any, 'Error in ExpertService.getOrCreateSession:');
      throw error;
    }
  }

  async getMessages(sessionId: string) {
    try {
      return await prisma.expertChatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (error) {
      logger.error(error as any, 'Error in ExpertService.getMessages:');
      throw error;
    }
  }

  async getExpertSessions(expertId: string) {
    try {
      const sessions = await prisma.expertChatSession.findMany({
        where: { expertId },
        include: {
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { lastMsgAt: 'desc' }
      });

      const sessionsWithUnread = await Promise.all(sessions.map(async (session: any) => {
        const unreadCount = await prisma.expertChatMessage.count({
          where: {
            sessionId: session.id,
            isRead: false,
            NOT: { senderId: expertId }
          }
        });
        return { ...session, unreadCount };
      }));

      return sessionsWithUnread;
    } catch (error) {
      logger.error(error as any, 'Error in ExpertService.getExpertSessions:');
      throw error;
    }
  }

  async saveMessage(sessionId: string, senderId: string, content: string) {
    try {
      const message = await prisma.expertChatMessage.create({
        data: {
          sessionId,
          senderId,
          content
        }
      });

      const session = await prisma.expertChatSession.update({
        where: { id: sessionId },
        data: { lastMsgAt: new Date() },
        include: {
          user: { select: { id: true, fcmToken: true, profile: { select: { displayName: true } } } },
          expert: { select: { id: true, fcmToken: true, profile: { select: { displayName: true } } } }
        }
      });

      // Send push notification to the recipient
      try {
        const isUserSender = session.userId === senderId;
        const recipient = isUserSender ? session.expert : session.user;
        const sender = isUserSender ? session.user : session.expert;
        const senderName = sender.profile?.displayName || (isUserSender ? 'User' : 'Expert');

        if (recipient && recipient.fcmToken) {
          const payload = {
            title: senderName,
            body: content,
            deepLink: `infano://expert/chat/${sessionId}`,
            data: {
              type: 'EXPERT_CHAT',
              sessionId,
            }
          };
          const { FirebaseService } = await import('../../common/services/firebase.service.js');
          FirebaseService.sendPushNotification(recipient.fcmToken, payload).catch(err => {
            logger.error({ err }, 'Failed to send Expert chat push notification');
          });
        }
      } catch (pushErr) {
        logger.error({ pushErr }, 'Error triggering expert chat push notification');
      }

      return message;
    } catch (error) {
      logger.error(error as any, 'Error in ExpertService.saveMessage:');
      throw error;
    }
  }

  async markAsRead(sessionId: string, userId: string) {
    try {
      return await prisma.expertChatMessage.updateMany({
        where: {
          sessionId,
          isRead: false,
          NOT: { senderId: userId }
        },
        data: { isRead: true }
      });
    } catch (error) {
      logger.error(error as any, 'Error in ExpertService.markAsRead:');
      throw error;
    }
  }
}

export async function notifyProgramSessionEvent(sessionId: string, eventType: "scheduled" | "rescheduled") {
  try {
    const session = await prisma.expertSessionSchedule.findUnique({
      where: { id: sessionId },
      include: {
        expert: { include: { profile: true } },
        user: { include: { profile: true } },
        program: true
      }
    });

    if (!session || !session.userId || !session.user) return;

    const expertName = session.expert.profile?.displayName || session.expert.username || "Expert";
    const userName = session.user.profile?.displayName || session.user.username || "User";
    const formattedDate = new Date(session.scheduledAt).toLocaleString();

    // Determine titles & bodies
    let userTitle = "";
    let userBody = "";
    let partnerBody = "";
    let expertTitle = "";
    let expertBody = "";

    const deepLink = `infano://expert/chat/${session.id}`;
    const notificationType = eventType === "scheduled" ? "sessionScheduled" : "sessionRescheduled";

    if (session.program) {
      const programTitle = session.program.title;
      const sessionNum = session.sessionNumber || 1;

      userTitle = eventType === "scheduled" ? "Program Session Scheduled" : "Program Session Rescheduled";
      userBody = eventType === "scheduled"
        ? `Session ${sessionNum} of your enrolled program "${programTitle}" with ${expertName} is scheduled for ${formattedDate}.`
        : `Session ${sessionNum} of your enrolled program "${programTitle}" with ${expertName} has been rescheduled to ${formattedDate}.`;

      partnerBody = eventType === "scheduled"
        ? `Session ${sessionNum} for ${userName} of program "${programTitle}" with ${expertName} is scheduled for ${formattedDate}.`
        : `Session ${sessionNum} for ${userName} of program "${programTitle}" with ${expertName} has been rescheduled to ${formattedDate}.`;

      expertTitle = eventType === "scheduled" ? "Program Session Booked" : "Program Session Rescheduled";
      expertBody = eventType === "scheduled"
        ? `You have a scheduled session ${sessionNum} with ${userName} for program "${programTitle}" on ${formattedDate}.`
        : `Session ${sessionNum} with ${userName} for program "${programTitle}" has been rescheduled to ${formattedDate}.`;
    } else {
      userTitle = eventType === "scheduled" ? "Expert Session Scheduled" : "Expert Session Rescheduled";
      userBody = eventType === "scheduled"
        ? `Your expert session with ${expertName} is scheduled for ${formattedDate}.`
        : `Your expert session with ${expertName} has been rescheduled to ${formattedDate}.`;

      partnerBody = eventType === "scheduled"
        ? `The expert session for ${userName} with ${expertName} is scheduled for ${formattedDate}.`
        : `The expert session for ${userName} with ${expertName} has been rescheduled to ${formattedDate}.`;

      expertTitle = eventType === "scheduled" ? "Expert Session Booked" : "Expert Session Rescheduled";
      expertBody = eventType === "scheduled"
        ? `A new expert session with ${userName} has been booked for ${formattedDate}.`
        : `Your expert session with ${userName} has been rescheduled to ${formattedDate}.`;
    }

    // 1. Notify User/Teen
    await prisma.notificationHistory.create({
      data: {
        userId: session.userId,
        type: notificationType,
        title: userTitle,
        body: userBody,
        deepLink,
        sentAt: new Date()
      }
    });

    if (session.user.fcmToken) {
      try {
        const { FirebaseService } = await import("../../common/services/firebase.service.js");
        await FirebaseService.sendPushNotification(session.user.fcmToken, {
          title: userTitle,
          body: userBody,
          deepLink,
          data: { notificationType, sessionId: session.id }
        });
      } catch (err) {
        console.error("Failed to send push notification to user for session event:", err);
      }
    }

    // 2. Notify Linked Partner (if any)
    const link = await prisma.parentLink.findFirst({
      where: {
        OR: [
          { teenId: session.userId },
          { parentId: session.userId }
        ],
        status: "LINKED"
      }
    });

    if (link) {
      const partnerId = session.userId === link.teenId ? link.parentId : link.teenId;
      if (partnerId) {
        const partnerUser = await prisma.user.findUnique({
          where: { id: partnerId }
        });

        await prisma.notificationHistory.create({
          data: {
            userId: partnerId,
            type: notificationType,
            title: userTitle,
            body: partnerBody,
            deepLink,
            sentAt: new Date()
          }
        });

        if (partnerUser?.fcmToken) {
          try {
            const { FirebaseService } = await import("../../common/services/firebase.service.js");
            await FirebaseService.sendPushNotification(partnerUser.fcmToken, {
              title: userTitle,
              body: partnerBody,
              deepLink,
              data: { notificationType, sessionId: session.id }
            });
          } catch (err) {
            console.error("Failed to send push notification to partner for session event:", err);
          }
        }
      }
    }

    // 3. Notify Expert
    await prisma.notificationHistory.create({
      data: {
        userId: session.expertId,
        type: notificationType,
        title: expertTitle,
        body: expertBody,
        deepLink,
        sentAt: new Date()
      }
    });

    if (session.expert.fcmToken) {
      try {
        const { FirebaseService } = await import("../../common/services/firebase.service.js");
        await FirebaseService.sendPushNotification(session.expert.fcmToken, {
          title: expertTitle,
          body: expertBody,
          deepLink,
          data: { notificationType, sessionId: session.id }
        });
      } catch (err) {
        console.error("Failed to send push notification to expert for session event:", err);
      }
    }
  } catch (err) {
    console.error("Failed to send notifications for session event:", err);
  }
}
