import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger.js';

const prisma = new PrismaClient();

export class ExpertService {
  /**
   * List all available experts
   */
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

      // Map to include unreadCount
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

  /**
   * Get or create a chat session with an expert
   */
  async getOrCreateSession(userId: string, expertId: string) {
    try {
      let session = await prisma.expertChatSession.findFirst({
        where: {
          OR: [
            { userId, expertId },
            { userId: expertId, expertId: userId } // Expert as initiator (optional)
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

  /**
   * Fetch chat history
   */
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

  /**
   * Fetch all active sessions for an expert
   */
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

      // Get unread counts manually for each session
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

  /**
   * Save a new expert message
   */
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

  /**
   * Mark messages as read in a session
   */
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
