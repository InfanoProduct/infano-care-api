import { prisma } from '../../db/client.js';
import { RequestSessionInput, SessionFeedbackInput, MentorAvailabilityInput, MentorOnboardInput } from './peerline.schema.js';
import { PeerLineStatus } from '@prisma/client';
// import { broadcastAvailabilityUpdate } from './peerline.socket.js'; // Dynamic import used below
import { AppError } from '../../common/middleware/errorHandler.js';
import { normalizePhone } from '../../common/utils/phone.js';

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

  async getTopics() {
    return prisma.peerLineTopic.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
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
    // 1a. If requesting a specific mentor, check for an existing request to that mentor
    if (input.requestedMentorId) {
      const existingDirectRequest = await prisma.peerLineSession.findFirst({
        where: {
          menteeId: userId,
          mentorId: input.requestedMentorId,
          status: { in: [PeerLineStatus.MATCHING, PeerLineStatus.QUEUED, PeerLineStatus.ACTIVE] }
        }
      });
      if (existingDirectRequest) {
        // Return existing session – do not create a duplicate
        return existingDirectRequest;
      }
    }

    // 1b. Check if user already has any active/matching session (generic queue)
    const existingSession = await prisma.peerLineSession.findFirst({
      where: {
        menteeId: userId,
        mentorId: input.requestedMentorId ? undefined : null, // only block generic if no specific mentor
        status: { in: [PeerLineStatus.MATCHING, PeerLineStatus.QUEUED, PeerLineStatus.ACTIVE] }
      }
    });

    if (existingSession && !input.requestedMentorId) {
      if (existingSession.status === PeerLineStatus.ACTIVE && existingSession.mentorId) {
        const mentorProfile = await prisma.profile.findUnique({
          where: { userId: existingSession.mentorId }
        });

        // If mentor is no longer available, reset the session to QUEUED
        const now = new Date();
        const isOffline = !mentorProfile?.isAvailable || (mentorProfile?.unavailableUntil && mentorProfile.unavailableUntil > now);

        if (isOffline) {
          return await prisma.peerLineSession.update({
            where: { id: existingSession.id },
            data: { status: PeerLineStatus.QUEUED, mentorId: null }
          });
        }
      }
      return existingSession;
    }

    // 2. Determine initial status based on mentor availability
    const { available_mentor_count } = await this.getAvailability();
    let initialStatus = available_mentor_count > 0 ? PeerLineStatus.MATCHING : PeerLineStatus.QUEUED;

    // If requesting a specific mentor, override status to MATCHING
    if (input.requestedMentorId) {
      initialStatus = PeerLineStatus.MATCHING;
    }

    // 3. Create session
    const session = await prisma.peerLineSession.create({
      data: {
        menteeId: userId,
        mentorId: input.requestedMentorId || null,
        topicIds: input.topicIds,
        status: initialStatus,
        requestedVerified: input.requestVerified ?? false,
      },
    });

    // 4. Update queue for mentors via socket
    try {
      const socketModule = await import('./peerline.socket.js');
      await socketModule.broadcastQueueUpdate();
    } catch (e) {
      console.error('[PeerLine] Socket broadcast failed after request:', e);
    }

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

  async createMessage(userId: string, sessionId: string, content: string | null, senderRole: 'mentee' | 'mentor' | 'system', messageType: 'TEXT' | 'VOICE' | 'IMAGE' = 'TEXT', mediaUrl?: string) {
    // 1. Verify access and status
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) throw new Error('Session not found');
    if (session.status !== PeerLineStatus.ACTIVE && senderRole !== 'system') {
      throw new Error('Can only send messages in an active session');
    }

    // 2. Scan for PII (Server side enforcement) - Only for text
    if (content && this.scanForPII(content) && senderRole !== 'system') {
      throw new Error('PII_BLOCKED');
    }

    // 3. Scan for Crisis - Only for text
    const crisisDetected = content ? this.scanForCrisis(content) : false;

    // 4. Create message
    const message = await prisma.peerLineMessage.create({
      data: {
        sessionId,
        senderRole,
        content: content || "",
        messageType: messageType as any,
        mediaUrl,
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

    if (session.status === PeerLineStatus.COMPLETED || session.status === PeerLineStatus.CANCELLED) {
      return session; // Already ended
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

    try {
      const socketModule = await import('./peerline.socket.js');
      await socketModule.broadcastAvailabilityUpdate();
    } catch (e) {
      console.error('[PeerLine] Socket broadcast failed during availability update:', e);
    }

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
      socketModule.broadcastQueueUpdate(); // Notify other mentors that queue size changed
    } catch (socketError) {
      console.error('[PeerLine] Socket broadcast failed after successful claim:', socketError);
    }

    return claimedSession;
  }

  async acceptSession(mentorId: string, sessionId: string) {
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Must be assigned to this mentor, and in MATCHING or QUEUED state
    if (session.mentorId !== mentorId) {
      throw new AppError('Unauthorized: Session is not assigned to you', 403);
    }

    if (session.status !== PeerLineStatus.MATCHING && session.status !== PeerLineStatus.QUEUED) {
      throw new AppError('Session cannot be accepted in its current state', 400);
    }

    const acceptedSession = await prisma.peerLineSession.update({
      where: { id: sessionId },
      data: {
        status: PeerLineStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    // Trigger socket notification for mentee
    try {
      const socketModule = await import('./peerline.socket.js');
      socketModule.broadcastSessionReady(acceptedSession.id, acceptedSession.menteeId);
      socketModule.broadcastQueueUpdate(); // Notify other mentors that queue size changed
    } catch (socketError) {
      console.error('[PeerLine] Socket broadcast failed after accepting session:', socketError);
    }

    return acceptedSession;
  }

  async getMentorsByTopics(userId: string, topicIds: string[]) {
    const where: any = {
      profile: {
        mentorStatus: 'certified',
      }
    };

    if (topicIds && topicIds.length > 0) {
      where.profile.certifiedTopicIds = { hasSome: topicIds };
    }

    const [allTopics, mentors] = await Promise.all([
      prisma.peerLineTopic.findMany({ where: { isActive: true } }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          profile: {
            select: {
              displayName: true,
              isAvailable: true,
              unavailableUntil: true,
              certifiedTopicIds: true,
              mentorExpertise: true,
              bio: true,
              completedSessionsCount: true,
            }
          }
        }
      })
    ]);

    const topicNameMap = allTopics.reduce((acc, t) => {
      acc[t.id] = t.name;
      return acc;
    }, {} as Record<string, string>);

    const activeSessions = await prisma.peerLineSession.findMany({
      where: {
        menteeId: userId,
        status: { in: [PeerLineStatus.MATCHING, PeerLineStatus.QUEUED, PeerLineStatus.ACTIVE] }
      }
    });
    
    const sessionMentorIds = new Set(activeSessions.map(s => s.mentorId).filter(id => id !== null));

    return mentors.map(m => {
      const isOnline = m.profile?.isAvailable && (!m.profile.unavailableUntil || m.profile.unavailableUntil < new Date());
      
      // Resolve topic names
      const topicNames = (m.profile?.certifiedTopicIds || []).map(id => topicNameMap[id]).filter(Boolean);
      
      // Get expertise tags for the selected topics (or all if none selected)
      const expertise = (m.profile?.mentorExpertise as any) || {};
      let expertiseTags: string[] = [];
      
      const topicsToInclude = topicIds.length > 0 ? topicIds : (m.profile?.certifiedTopicIds || []);
      topicsToInclude.forEach(id => {
        if (expertise[id] && Array.isArray(expertise[id])) {
          expertiseTags = [...expertiseTags, ...expertise[id]];
        }
      });

      return {
        id: m.id,
        name: m.profile?.displayName || 'Peer Mentor',
        isOnline,
        unavailableUntil: m.profile?.unavailableUntil,
        rating: 5.0,
        topics: topicNames,
        expertiseTags: [...new Set(expertiseTags)], // Unique tags
        bio: m.profile?.bio || 'Helping girls navigate their journey with empathy and care.',
        experienceCount: m.profile?.completedSessionsCount || 0,
        hasPendingRequest: sessionMentorIds.has(m.id),
      };
    });


  }

  async updateMentorExpertise(userId: string, expertise: any) {
    return prisma.profile.update({
      where: { userId },
      data: {
        mentorExpertise: expertise
      }
    });
  }

  private async getMentorSessionCount(mentorId: string): Promise<number> {
    return prisma.peerLineSession.count({
      where: { mentorId, status: PeerLineStatus.COMPLETED }
    });
  }

  async onboardMentor(userId: string | undefined, input: MentorOnboardInput) {
    if (!userId) return { success: true, guest: true, ...input };
    const { topicIds, name, email, phone } = input;
    
    let profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          displayName: name || 'Peer Mentor',
          mentorStatus: 'certified',
          certifiedTopicIds: topicIds,
          isAvailable: true,
        }
      });
    } else {
      profile = await prisma.profile.update({
        where: { userId },
        data: {
          displayName: name || profile.displayName,
          mentorStatus: 'certified',
          certifiedTopicIds: topicIds,
          isAvailable: true,
        }
      });
    }
    
    try {
      const socketModule = await import('./peerline.socket.js');
      await socketModule.broadcastAvailabilityUpdate();
    } catch (e) {
      console.error('[PeerLine] Socket broadcast failed during onboard:', e);
    }

    return profile;
  }

  async applyToMentor(userId: string | undefined, input: any) {
    let targetUserId = userId;

    if (!targetUserId) {
      // It's a guest application, try to find or create user
      const normalizedPhone = normalizePhone(input.phone);
      let user = await prisma.user.findFirst({
        where: { OR: [{ phone: normalizedPhone }, { username: input.email }] }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: input.email,
            phone: normalizePhone(input.phone),
            password: 'temp_password_' + Date.now(), // Real app would send welcome email
            role: 'TEEN',
            peerOnboarding: true,
            accountStatus: 'PENDING_SETUP'
          }
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { peerOnboarding: true }
        });
      }
      targetUserId = user.id;
    } else {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { peerOnboarding: true }
      });
    }

    // Check if application already exists
    const existingApp = await prisma.peerApplication.findUnique({ 
      where: { userId: targetUserId } 
    });
    if (existingApp && existingApp.status !== 'none') {
      const error = new AppError('You have already submitted an application. Please wait for the review process.', 400);
      (error as any).details = {
        status: existingApp.status,
        certificationStatus: existingApp.certificationStatus
      };
      throw error;
    }

    // Ensure profile exists
    let profile = await prisma.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: targetUserId,
          displayName: input.name || 'Peer Applicant',
          mentorStatus: 'applied'
        }
      });
    } else {
      profile = await prisma.profile.update({
        where: { userId: targetUserId },
        data: { mentorStatus: 'applied' }
      });
    }

    // Save application data
    await prisma.peerApplication.upsert({
      where: { userId: targetUserId },
      update: {
        name: input.name,
        email: input.email,
        phone: normalizePhone(input.phone),
        personalStatement: input.personalStatement,
        scenarioResponses: input.scenarioResponses || [],
        eligibility: input.eligibility || {},
        status: 'pending'
      },
      create: {
        userId: targetUserId,
        name: input.name,
        email: input.email,
        phone: normalizePhone(input.phone),
        personalStatement: input.personalStatement,
        scenarioResponses: input.scenarioResponses || [],
        eligibility: input.eligibility || {},
        status: 'pending'
      }
    });

    return profile;
  }

  async updateTrainingProgress(userId: string, episodeSlug: string, reflection?: string, checks?: any) {
    let app = await prisma.peerApplication.findUnique({ where: { userId } });
    if (!app) {
      const profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
      if (profile && profile.mentorStatus !== 'none') {
        app = await prisma.peerApplication.create({
          data: {
            userId,
            name: profile.displayName || 'Peer Mentor',
            email: profile.user.username || '',
            phone: profile.user.phone || '',
            personalStatement: 'Auto-created during training',
            scenarioResponses: [],
            eligibility: {},
            status: 'pending'
          }
        });
      } else {
        throw new Error('Peer application not found');
      }
    }

    const completed = new Set(app.completedEpisodes || []);
    completed.add(episodeSlug);

    const currentAnswers = (app.episodeAnswers as any) || {};
    currentAnswers[episodeSlug] = { reflection, checks, timestamp: new Date() };

    return prisma.peerApplication.update({
      where: { userId },
      data: { 
        completedEpisodes: Array.from(completed),
        episodeAnswers: currentAnswers
      }
    });
  }

  async submitAssessment(userId: string, score: number, answers: any) {
    let app = await prisma.peerApplication.findUnique({ where: { userId } });
    if (!app) {
      const profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
      if (profile && profile.mentorStatus !== 'none') {
        app = await prisma.peerApplication.create({
          data: {
            userId,
            name: profile.displayName || 'Peer Mentor',
            email: profile.user.username || '',
            phone: profile.user.phone || '',
            personalStatement: 'Auto-created during assessment',
            scenarioResponses: [],
            eligibility: {},
            status: 'pending'
          }
        });
      } else {
        throw new Error('Peer application not found');
      }
    }

    // Check if locked
    if (app.lockUntil && app.lockUntil > new Date()) {
      throw new Error(`Assessment locked until ${app.lockUntil.toLocaleDateString()}. Please wait for the cooling-off period.`);
    }

    const isPassed = score >= 80;
    const newAttempts = (app.assessmentAttempts || 0) + 1;
    
    let lockUntil: Date | null = null;
    let status = app.certificationStatus;

    if (isPassed) {
      // If they were previously unapproved, they already signed the conduct, so go straight to submitted
      // Otherwise, new applicants must still sign the Code of Conduct
      status = app.certificationStatus === 'unapproved' ? 'submitted' : 'pending_conduct';
    } else if (newAttempts >= 2) {
      // Failed 2 attempts, lock for 14 days
      lockUntil = new Date();
      lockUntil.setDate(lockUntil.getDate() + 14);
      // Reset episodes as per guide "re-completion of relevant Episodes"
      // For simplicity, we reset all, or we could keep them. Guide says "re-completion".
    }

    return prisma.peerApplication.update({
      where: { userId },
      data: {
        trainingScore: score,
        trainingAnswers: answers,
        assessmentAttempts: newAttempts,
        lastAttemptAt: new Date(),
        lockUntil,
        certificationStatus: status,
        // If locked, we reset completed episodes to force re-completion
        completedEpisodes: lockUntil ? [] : undefined 
      }
    });
  }

  async agreeToConduct(userId: string) {
    const app = await prisma.peerApplication.findUnique({ where: { userId } });
    if (!app || app.certificationStatus !== 'pending_conduct') {
      throw new Error('Invalid application state for Code of Conduct agreement');
    }

    return prisma.peerApplication.update({
      where: { userId },
      data: {
        certificationStatus: 'submitted'
      }
    });
  }

  async getTrainingStatus(userId: string) {
    let app = await prisma.peerApplication.findUnique({
      where: { userId },
      select: {
        status: true,
        certificationStatus: true,
        completedEpisodes: true,
        trainingScore: true,
        assessmentAttempts: true,
        lockUntil: true,
        episodeAnswers: true,
        name: true,
        certificateId: true,
        certifiedAt: true
      }
    });

    if (!app) {
      // Check if they should have one (e.g. they are a mentor or applied)
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (profile && profile.mentorStatus !== 'none') {
        return {
          status: 'approved',
          certificationStatus: 'pending_training',
          completedEpisodes: [],
          trainingScore: null,
          assessmentAttempts: 0,
          lockUntil: null
        };
      }
      return {
        status: 'none',
        certificationStatus: 'unregistered',
        completedEpisodes: [],
        trainingScore: null,
        assessmentAttempts: 0,
        lockUntil: null
      };
    }
    return app;
  }
}

