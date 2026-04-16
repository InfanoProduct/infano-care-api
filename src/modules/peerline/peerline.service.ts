import { prisma } from '../../db/client.js';
import { RequestSessionInput, SessionFeedbackInput, MentorAvailabilityInput } from './peerline.schema.js';
import { PeerLineStatus } from '@prisma/client';
import { broadcastAvailabilityUpdate } from './peerline.socket.js';
import { AppError } from '../../common/middleware/errorHandler.js';

export class PeerLineService {
  async getAvailability() {
    const availableCount = await prisma.user.count({
      where: {
        profile: {
          mentorStatus: 'certified',
          isAvailable: true,
          OR: [
            { unavailableUntil: null },
            { unavailableUntil: { lt: new Date() } }
          ]
        }
      },
    });

    return {
      available_mentor_count: availableCount,
      estimated_wait_minutes: availableCount > 0 ? 0 : 15,
      is_available: availableCount > 0,
    };
  }

  async getMentorStatus(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile || profile.mentorStatus !== 'certified') {
      return { is_certified: false };
    }

    const activeSession = await prisma.peerLineSession.findFirst({
      where: {
        mentorId: userId,
        status: PeerLineStatus.ACTIVE
      }
    });

    const isAvailable = !profile.unavailableUntil || profile.unavailableUntil < new Date();

    // Check for safety check-in
    let pendingNudge = null;
    if (profile.pendingSafetyCheckin) {
      pendingNudge = {
        type: 'SAFETY_CHECKIN',
        message: "We wanted to check in. How are you doing? Resources are always here for you too."
      };
      // We don't reset it here, usually the frontend will trigger a dismissal or we reset it when a session starts
    }

    const completedSessions = await prisma.peerLineSession.findMany({
      where: {
        mentorId: userId,
        status: PeerLineStatus.COMPLETED
      }
    });

    const mentorRatingAvg = completedSessions.length > 0 
      ? completedSessions.reduce((acc, s) => acc + (s.menteeRating ?? 5), 0) / completedSessions.length 
      : 5.0;

    const queueCount = await prisma.peerLineSession.count({
      where: {
        status: { in: [PeerLineStatus.QUEUED, PeerLineStatus.MATCHING] },
        mentorId: null,
        topicIds: { hasSome: profile.certifiedTopicIds }
      }
    });

    return {
      is_certified: true,
      is_available: isAvailable && profile.isAvailable,
      queue_count: queueCount,
      active_session_id: activeSession?.id,
      mentor_rating_avg: parseFloat(mentorRatingAvg.toFixed(1)),
      unavailable_until: profile.unavailableUntil,
      safety_nudge: pendingNudge
    };
  }

  async requestSession(userId: string, input: RequestSessionInput) {
    // 1. Check if user already has an active or matching session
    const existingSession = await prisma.peerLineSession.findFirst({
      where: {
        menteeId: userId,
        status: { in: [PeerLineStatus.MATCHING, PeerLineStatus.QUEUED, PeerLineStatus.ACTIVE] }
      }
    });

    if (existingSession) {
      return existingSession;
    }

    // 2. Determine initial status based on mentor availability
    const { available_mentor_count } = await this.getAvailability();
    const initialStatus = available_mentor_count > 0 ? PeerLineStatus.MATCHING : PeerLineStatus.QUEUED;

    // 3. Create session
    const session = await prisma.peerLineSession.create({
      data: {
        menteeId: userId,
        topicIds: input.topicIds,
        status: initialStatus,
        requestedVerified: input.requestVerified ?? false,
      },
    });

    return session;
  }


  // Force reload
  async getSessions(userId: string, options: { role?: string; status?: string } = {}) {
    const where: any = {
      AND: [
        {
          OR: [{ menteeId: userId }, { mentorId: userId }],
        },
      ],
    };

    if (options.role === 'mentee') {
      where.AND.push({ menteeId: userId });
    } else if (options.role === 'mentor') {
      where.AND.push({ mentorId: userId });
    }

    if (options.status) {
      where.AND.push({ status: options.status.toUpperCase() as any });
    }

    return prisma.peerLineSession.findMany({
      where,
      include: {
        mentor: {
          select: { profile: { select: { displayName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSession(userId: string, sessionId: string) {
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          select: { profile: { select: { displayName: true } } },
        },
      },
    });

    if (!session || (session.menteeId !== userId && session.mentorId !== userId)) {
      throw new Error('Unauthorized');
    }

    const otherRole = session.menteeId === userId ? 'mentor' : 'mentee';
    const unreadCount = await prisma.peerLineMessage.count({
      where: {
        sessionId,
        isRead: false,
        senderRole: otherRole
      }
    });

    return { ...session, unreadCount };
  }

  async markAsRead(userId: string, sessionId: string) {
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || (session.menteeId !== userId && session.mentorId !== userId)) {
      throw new Error('Unauthorized');
    }

    const otherRole = session.menteeId === userId ? 'mentor' : 'mentee';

    return prisma.peerLineMessage.updateMany({
      where: {
        sessionId,
        senderRole: otherRole,
        isRead: false
      },
      data: { isRead: true }
    });
  }

  async getMessages(userId: string, sessionId: string) {
    // 1. Verify access
    const session = await this.getSession(userId, sessionId);
    
    return prisma.peerLineMessage.findMany({
      where: { sessionId },
      orderBy: { sentAt: 'asc' }
    });
  }

  async createMessage(userId: string, sessionId: string, content: string, senderRole: 'mentee' | 'mentor' | 'system') {
    // 1. Verify access and status
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) throw new Error('Session not found');
    if (session.status !== PeerLineStatus.ACTIVE && senderRole !== 'system') {
      throw new Error('Can only send messages in an active session');
    }

    // 2. Scan for PII (Server side enforcement)
    if (this.scanForPII(content) && senderRole !== 'system') {
      throw new Error('PII_BLOCKED');
    }

    // 3. Scan for Crisis
    const crisisDetected = this.scanForCrisis(content);

    // 4. Create message
    const message = await prisma.peerLineMessage.create({
      data: {
        sessionId,
        senderRole,
        content,
        crisisFlag: crisisDetected,
      }
    });

    // 5. Update session flag if crisis detected
    if (crisisDetected) {
      await prisma.peerLineSession.update({
        where: { id: sessionId },
        data: { hadCrisisFlag: true }
      });
    }

    return message;
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await prisma.peerLineMessage.findUnique({
      where: { id: messageId },
      include: { session: true }
    });

    if (!message) throw new Error('Message not found');
    
    // Only the sender can delete their own message
    // Note: Technically we should check userId against menteeId/mentorId based on senderRole
    // but for simplicity in PeerLine, we just ensure the user is part of the session
    if (message.session.menteeId !== userId && message.session.mentorId !== userId) {
      throw new Error('Unauthorized');
    }

    return prisma.peerLineMessage.delete({
      where: { id: messageId }
    });
  }

  scanForPII(content: string): boolean {
    const phoneRegex = /(\+?\d{1,4}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

    return phoneRegex.test(content) || emailRegex.test(content) || urlRegex.test(content);
  }

  scanForCrisis(content: string): boolean {
    const crisisKeywords = [
      'kill myself', 'suicide', 'end it all', 'die', 'hurt myself', 
      'cutting', 'hopeless', 'give up', 'no reason to live'
    ];
    
    const lowerContent = content.toLowerCase();
    return crisisKeywords.some(keyword => lowerContent.includes(keyword));
  }

  async submitFeedback(userId: string, sessionId: string, input: SessionFeedbackInput) {
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new Error('Session not found');

    if (input.role === 'mentee') {
      if (session.menteeId !== userId) throw new Error('Unauthorized');
      
      return prisma.peerLineSession.update({
        where: { id: sessionId },
        data: { 
          menteeRating: input.rating,
          menteeNote: input.note
        },
      });
    } else {
      if (session.mentorId !== userId) throw new Error('Unauthorized');

      // 1. Handle Cooldown
      if (input.readyForNext === false) {
        const cooldownUntil = new Date();
        cooldownUntil.setHours(cooldownUntil.getHours() + 2);
        
        await prisma.profile.update({
          where: { userId },
          data: { unavailableUntil: cooldownUntil }
        });
      }

      // 2. Handle Safety Check-in flag
      if (input.needsSupport === true) {
        await prisma.profile.update({
          where: { userId },
          data: { pendingSafetyCheckin: true }
        });
      }

      return prisma.peerLineSession.update({
        where: { id: sessionId },
        data: { 
          mentorRating: input.rating,
          mentorSelfRating: input.mentorSelfRating,
          mentorWellbeingOk: input.wellbeingOk,
          mentorNeedsSupport: input.needsSupport,
          mentorReadyForNext: input.readyForNext,
          mentorModerationFlag: input.flagForModeration,
          mentorNote: input.note
        },
      });
    }
  }

  async endSession(userId: string, sessionId: string) {
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || (session.menteeId !== userId && session.mentorId !== userId)) {
      throw new Error('Unauthorized');
    }

    const updatedSession = await prisma.peerLineSession.update({
      where: { id: sessionId },
      data: {
        status: PeerLineStatus.COMPLETED,
        endedAt: new Date(),
        endReason: session.menteeId === userId ? 'mentee_ended' : 'mentor_ended',
      },
    });

    // Award points to mentor
    if (session.mentorId) {
      await prisma.profile.update({
        where: { userId: session.mentorId },
        data: { totalPoints: { increment: 40 } }
      });
    }

    return updatedSession;
  }

  async cancelSession(userId: string, sessionId: string) {
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.menteeId !== userId) {
      throw new Error('Unauthorized or session not found');
    }

    if (session.status === PeerLineStatus.ACTIVE || session.status === PeerLineStatus.COMPLETED) {
      throw new Error('Cannot cancel an active or completed session');
    }

    return prisma.peerLineSession.update({
      where: { id: sessionId },
      data: {
        status: PeerLineStatus.CANCELLED,
        endedAt: new Date(),
        endReason: 'mentee_cancelled',
      },
    });
  }

  async getQueuePosition(userId: string, sessionId: string) {
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.menteeId !== userId) {
      throw new Error('Unauthorized or session not found');
    }

    if (session.status !== PeerLineStatus.QUEUED && session.status !== PeerLineStatus.MATCHING) {
      return { position: 0, status: session.status };
    }

    // Count how many QUEUED or MATCHING sessions were created before this one
    const aheadCount = await prisma.peerLineSession.count({
      where: {
        status: { in: [PeerLineStatus.QUEUED, PeerLineStatus.MATCHING] },
        createdAt: { lt: session.createdAt },
      }
    });

    return {
      position: aheadCount + 1,
      status: session.status,
      estimated_wait_minutes: (aheadCount + 1) * 5, // Simple heuristic: 5 mins per person
    };
  }

  async getMentorStats(userId: string) {
    const [sessions, profile] = await Promise.all([
      prisma.peerLineSession.findMany({
        where: { 
          mentorId: userId,
          status: { notIn: [PeerLineStatus.COMPLETED, PeerLineStatus.CANCELLED] } 
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.profile.findUnique({
        where: { userId }
      })
    ]);

    const [sessionsTotal, sessionsThisWeek, completedSessionsRecords] = await Promise.all([
      prisma.peerLineSession.count({
        where: { mentorId: userId, status: PeerLineStatus.COMPLETED }
      }),
      prisma.peerLineSession.count({
        where: { 
          mentorId: userId, 
          status: PeerLineStatus.COMPLETED,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.peerLineSession.findMany({
        where: { mentorId: userId, status: PeerLineStatus.COMPLETED },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          mentee: { select: { profile: { select: { displayName: true } } } }
        }
      })
    ]);

    const queueCount = await prisma.peerLineSession.count({
      where: { 
        status: { in: [PeerLineStatus.QUEUED, PeerLineStatus.MATCHING] },
        mentorId: null,
        topicIds: { hasSome: profile?.certifiedTopicIds || [] }
      }
    });

    const avgScore = sessionsTotal > 0 
      ? (await prisma.peerLineSession.aggregate({
          where: { mentorId: userId, status: PeerLineStatus.COMPLETED },
          _avg: { menteeRating: true }
        }))._avg.menteeRating || 5.0
      : 5.0;
    
    // Tier threshold: Bronze (0-9), Silver (10-49), Gold (50+)
    let badgeTier = 'Bronze';
    if (sessionsTotal >= 50) badgeTier = 'Gold';
    else if (sessionsTotal >= 10) badgeTier = 'Silver';

    const activeSessions = await Promise.all(
      sessions.map(async (s) => {
        const unreadCount = await prisma.peerLineMessage.count({
          where: {
            sessionId: s.id,
            isRead: false,
            senderRole: 'mentee'
          }
        });
        
        // Fetch mentee name
        const sessionWithMentee = await prisma.peerLineSession.findUnique({
          where: { id: s.id },
          include: { 
            mentee: { select: { profile: { select: { displayName: true } } } } 
          }
        });

        return {
          id: s.id,
          date: s.createdAt,
          topicIds: s.topicIds,
          status: s.status,
          unreadCount,
          menteeName: sessionWithMentee?.mentee?.profile?.displayName || 'Mentee'
        };
      })
    );

    return {
      sessionsThisWeek,
      sessionsTotal,
      avgMenteeRating: avgScore.toFixed(1),
      badgeTier,
      certificationLevel: profile?.mentorStatus || 'none',
      certifiedTopicIds: profile?.certifiedTopicIds || [],
      queueCount,
      isAvailable: profile?.isAvailable ?? false,
      completedSessions: completedSessionsRecords.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        topicIds: s.topicIds,
        menteeRating: s.menteeRating,
        menteeName: s.mentee?.profile?.displayName || 'Mentee'
      })),
      activeSessions
    };
  }

  async updateMentorAvailability(userId: string, isAvailable: boolean) {
    const profile = await prisma.profile.update({
      where: { userId },
      data: { isAvailable }
    });
    
    await broadcastAvailabilityUpdate();
    
    return {
      is_available: profile.isAvailable,
      updated_at: new Date()
    };
  }

  async claimNextSession(mentorId: string) {
    // 1. Get mentor profile for topics
    const profile = await prisma.profile.findUnique({
      where: { userId: mentorId },
      include: { user: true }
    });

    if (!profile || profile.mentorStatus !== 'certified') {
      throw new AppError('UNAUTHORIZED_NOT_CERTIFIED', 403);
    }

    if (!profile.isAvailable) {
      throw new AppError('MENTOR_NOT_AVAILABLE', 400);
    }

    // 2. Find matching session with age gap and verified rules
    const mentorAge = profile.user.birthYear ? (new Date().getFullYear() - profile.user.birthYear) : 20;

    const sessions = await prisma.peerLineSession.findMany({
      where: {
        status: { in: [PeerLineStatus.QUEUED, PeerLineStatus.MATCHING] },
        mentorId: null,
        topicIds: {
          hasSome: profile.certifiedTopicIds
        },
        // If mentor is not verified, they cannot claim sessions that requested a verified mentor
        requestedVerified: profile.mentorStatus === 'certified' && (await this.getMentorSessionCount(mentorId)) >= 5 ? undefined : false
      },
      include: {
        mentee: {
          select: { birthYear: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Filter by 4-year age gap
    const bestSession = sessions.find(s => {
      if (!s.mentee.birthYear || !profile.user.birthYear) return true; // Fallback if no DOB
      const menteeAge = new Date().getFullYear() - s.mentee.birthYear;
      return Math.abs(mentorAge - menteeAge) <= 4;
    });

    if (!bestSession) {
      console.log(`[PeerLine] No matching sessions for mentor ${mentorId}. Queue size: ${sessions.length}`);
      throw new AppError('NO_MATCHING_SESSIONS', 404);
    }

    // 3. Claim it
    const claimedSession = await prisma.peerLineSession.update({
      where: { id: bestSession.id },
      data: {
        mentorId,
        status: PeerLineStatus.ACTIVE,
        startedAt: new Date()
      }
    });

    // 4. Trigger socket notification for mentee
    try {
      const socketModule = await import('./peerline.socket.js');
      socketModule.broadcastSessionReady(claimedSession.id, claimedSession.menteeId);
    } catch (socketError) {
      console.error('[PeerLine] Socket broadcast failed after successful claim:', socketError);
    }

    return claimedSession;
  }

  private async getMentorSessionCount(mentorId: string): Promise<number> {
    return prisma.peerLineSession.count({
      where: { mentorId, status: PeerLineStatus.COMPLETED }
    });
  }
}
