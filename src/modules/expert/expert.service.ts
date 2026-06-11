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
          select: { id: true, title: true, sessions: true }
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

  static async getEnrollmentDetails(enrollmentId: string) {
    const enrollment = await prisma.programEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        program: {
          select: { id: true, title: true, sessions: true }
        },
        user: {
          select: { id: true, profile: { select: { displayName: true } }, username: true }
        }
      }
    });

    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Fetch all expert sessions for this specific user and program
    const sessions = await prisma.expertSessionSchedule.findMany({
      where: {
        userId: enrollment.userId,
        programId: enrollment.programId
      },
      orderBy: { sessionNumber: "asc" },
      include: { expert: { select: { username: true } } }
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
      orderBy: { scheduledAt: "asc" }
    });
  }

  static async scheduleSession(expertId: string, data: { userId: string, programId: string, sessionNumber: number, meetLink: string, scheduledAt: string }) {
    // Check if this session number is already scheduled
    const existing = await prisma.expertSessionSchedule.findFirst({
      where: {
        userId: data.userId,
        programId: data.programId,
        sessionNumber: data.sessionNumber
      }
    });

    if (existing) {
      // Update existing if already scheduled
      return await prisma.expertSessionSchedule.update({
        where: { id: existing.id },
        data: {
          expertId,
          meetLink: data.meetLink,
          scheduledAt: new Date(data.scheduledAt),
          status: "SCHEDULED"
        }
      });
    }

    return await prisma.expertSessionSchedule.create({
      data: {
        userId: data.userId,
        expertId,
        programId: data.programId,
        sessionNumber: data.sessionNumber,
        meetLink: data.meetLink,
        scheduledAt: new Date(data.scheduledAt),
        status: "SCHEDULED"
      }
    });
  }

  static async completeSession(expertId: string, sessionId: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");

    return await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" }
    });
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

      await prisma.expertChatSession.update({
        where: { id: sessionId },
        data: { lastMsgAt: new Date() }
      });
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
