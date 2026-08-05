import { prisma } from '../../db/client.js';
import { ConnectRequestInput, RequestSessionInput, SessionFeedbackInput, MentorAvailabilityInput, MentorOnboardInput } from './peerline.schema.js';
import { PeerLineStatus } from '@prisma/client';
// import { broadcastAvailabilityUpdate } from './peerline.socket.js'; // Dynamic import used below
import { AppError } from '../../common/middleware/errorHandler.js';
import { normalizePhone } from '../../common/utils/phone.js';
import { FirebaseService } from '../../common/services/firebase.service.js';
import { logger } from '../../config/logger.js';

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

    const isAvailable = !profile.unavailableUntil || profile.unavailableUntil < new Date();

    // Check for safety check-in
    let pendingNudge = null;
    if (profile.pendingSafetyCheckin) {
      pendingNudge = {
        type: 'SAFETY_CHECKIN',
        message: "We wanted to check in. How are you doing? Resources are always here for you too."
      };
    }

    // Count pending connection requests directed to this mentor
    const pendingRequestsCount = await prisma.peerLineSession.count({
      where: {
        mentorId: userId,
        status: PeerLineStatus.MATCHING // MATCHING = pending connection request
      }
    });

    // Count active connections (open chats)
    const activeConnectionsCount = await prisma.peerLineSession.count({
      where: {
        mentorId: userId,
        status: PeerLineStatus.ACTIVE
      }
    });

    return {
      is_certified: true,
      is_available: isAvailable && profile.isAvailable,
      pending_requests_count: pendingRequestsCount,
      active_connections_count: activeConnectionsCount,
      unavailable_until: profile.unavailableUntil,
      safety_nudge: pendingNudge
    };
  }

  /**
   * NEW: Instagram-style connection request — teen to a specific mentor.
   * Creates a single persistent connection record (status MATCHING = pending).
   * Once accepted it becomes ACTIVE and stays open forever.
   */
  async requestConnection(teenId: string, input: ConnectRequestInput) {
    const { mentorId, topicIds, message } = input;

    // Verify the mentor is certified
    const mentorProfile = await prisma.profile.findUnique({
      where: { userId: mentorId }
    });
    if (!mentorProfile || mentorProfile.mentorStatus !== 'certified') {
      throw new AppError('MENTOR_NOT_CERTIFIED', 400);
    }

    // Check if a connection already exists between this pair
    const existingConnection = await prisma.peerLineSession.findFirst({
      where: {
        menteeId: teenId,
        mentorId,
        status: { in: [PeerLineStatus.MATCHING, PeerLineStatus.ACTIVE] }
      }
    });
    if (existingConnection) {
      // Return the existing connection — no duplicates
      return existingConnection;
    }

    // Create the connection (starts as MATCHING = pending acceptance)
    const connection = await prisma.peerLineSession.create({
      data: {
        menteeId: teenId,
        mentorId,
        topicIds: topicIds || [],
        status: PeerLineStatus.MATCHING,
        requestedVerified: false,
      },
    });

    // If the teen included an intro message, save it
    if (message && message.trim().length > 0) {
      if (!this.scanForPII(message)) {
        await prisma.peerLineMessage.create({
          data: {
            sessionId: connection.id,
            senderRole: 'mentee',
            content: message.trim(),
            messageType: 'TEXT',
          }
        });
      }
    }

    // Notify the mentor of the new connection request
    try {
      const socketModule = await import('./peerline.socket.js');
      await socketModule.broadcastConnectionRequest(connection.id, mentorId);
    } catch (e) {
      console.error('[PeerLine] Socket broadcast failed after connection request:', e);
    }

    return connection;
  }

  /**
   * LEGACY: kept for backward-compat with old clients. Routes to requestConnection if mentorId is specified.
   */
  async requestSession(userId: string, input: RequestSessionInput) {
    // 1a. If requesting a specific mentor, check for an existing pending request to that mentor
    if (input.requestedMentorId) {
      const existingPendingDirectRequest = await prisma.peerLineSession.findFirst({
        where: {
          menteeId: userId,
          mentorId: input.requestedMentorId,
          status: { in: [PeerLineStatus.MATCHING, PeerLineStatus.QUEUED] }
        }
      });
      if (existingPendingDirectRequest) {
        // Return existing pending session – do not create a duplicate
        return existingPendingDirectRequest;
      }

      // Auto-complete any old abandoned ACTIVE sessions between this pair so a new request can be created
      await prisma.peerLineSession.updateMany({
        where: {
          menteeId: userId,
          mentorId: input.requestedMentorId,
          status: PeerLineStatus.ACTIVE
        },
        data: {
          status: PeerLineStatus.COMPLETED,
          endedAt: new Date(),
          endReason: 'auto_closed_new_request'
        }
      });
    }

    // 1b. Check if user already has a pending generic queue session
    const existingSession = await prisma.peerLineSession.findFirst({
      where: {
        menteeId: userId,
        mentorId: null,
        status: { in: [PeerLineStatus.MATCHING, PeerLineStatus.QUEUED] }
      }
    });

    if (existingSession && !input.requestedMentorId) {
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
      if (input.requestedMentorId) {
        await socketModule.broadcastDirectRequest(session.id, input.requestedMentorId);
      }
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

    let sessionIds = [sessionId];
    if (session.menteeId && session.mentorId) {
      const pairSessions = await prisma.peerLineSession.findMany({
        where: {
          menteeId: session.menteeId,
          mentorId: session.mentorId
        },
        select: { id: true }
      });
      sessionIds = pairSessions.map(s => s.id);
    }

    return prisma.peerLineMessage.updateMany({
      where: {
        sessionId: { in: sessionIds },
        senderRole: otherRole,
        isRead: false
      },
      data: { isRead: true }
    });
  }

  async getPairSessions(menteeId: string, mentorId: string): Promise<string[]> {
    const pairSessions = await prisma.peerLineSession.findMany({
      where: { menteeId, mentorId },
      select: { id: true }
    });
    return pairSessions.map(s => s.id);
  }

  async getMessages(userId: string, sessionId: string, options: { limit?: number; before?: string } = {}) {
    // 1. Verify access
    const session = await this.getSession(userId, sessionId);

    // Automatically mark incoming messages as read when fetched
    await this.markAsRead(userId, sessionId).catch(err => {
      logger.error(err, 'Failed to mark peerline messages as read in getMessages');
    });

    const limit = options.limit ? Math.min(options.limit, 100) : options.limit;
    let beforeDate: Date | undefined;
    if (options.before) {
      beforeDate = new Date(options.before);
    }

    const whereClause: any = {};
    if (session.menteeId && session.mentorId) {
      const pairSessions = await prisma.peerLineSession.findMany({
        where: {
          menteeId: session.menteeId,
          mentorId: session.mentorId
        },
        select: { id: true }
      });
      const sessionIds = pairSessions.map(s => s.id);
      whereClause.sessionId = { in: sessionIds };
    } else {
      whereClause.sessionId = sessionId;
    }

    if (beforeDate && !isNaN(beforeDate.getTime())) {
      whereClause.sentAt = { lt: beforeDate };
    }

    return prisma.peerLineMessage.findMany({
      where: whereClause,
      orderBy: { sentAt: 'desc' }, // Latest first for pagination
      take: limit,
    }).then(messages => messages.reverse()); // Reverse to keep chronological order
  }

  async createMessage(userId: string, sessionId: string, content: string | null, senderRole: 'mentee' | 'mentor' | 'system', messageType: 'TEXT' | 'VOICE' | 'IMAGE' = 'TEXT', mediaUrl?: string) {
    // 1. Verify connection exists and user is a participant
    const session = await prisma.peerLineSession.findUnique({
      where: { id: sessionId },
      include: {
        mentee: {
          select: {
            fcmToken: true,
            profile: { select: { displayName: true } }
          }
        },
        mentor: {
          select: {
            fcmToken: true,
            profile: { select: { displayName: true } }
          }
        }
      }
    });

    if (!session) throw new Error('Connection not found');

    // Allow messaging in ACTIVE connections. MATCHING (pending) connections:
    // only system messages or the initial intro message from the mentee are allowed.
    if (session.status !== PeerLineStatus.ACTIVE && session.status !== PeerLineStatus.MATCHING) {
      if (senderRole !== 'system') {
        throw new Error('Can only send messages in an active or pending connection');
      }
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
        messageType: (messageType || 'TEXT') as any,
        mediaUrl,
        crisisFlag: crisisDetected,
      }
    });

    // 5. Update connection flag if crisis detected
    if (crisisDetected) {
      await prisma.peerLineSession.update({
        where: { id: sessionId },
        data: { hadCrisisFlag: true }
      });
    }

    // 6. Send push notification to the other participant
    if (senderRole === 'mentee' || senderRole === 'mentor') {
      const recipient = senderRole === 'mentee' ? session.mentor : session.mentee;
      const sender = senderRole === 'mentee' ? session.mentee : session.mentor;
      const senderName = sender?.profile?.displayName || 'Peer';

      if (recipient && recipient.fcmToken) {
        const payload = {
          title: `Message from ${senderName}`,
          body: message.messageType === 'TEXT' ? (content || '') : (message.messageType === 'VOICE' ? '🎤 Voice note' : '📷 Image'),
          deepLink: `infano://peerline/chat/${sessionId}`,
          data: {
            type: 'PEERLINE_CHAT',
            sessionId,
          }
        };
        FirebaseService.sendPushNotification(recipient.fcmToken, payload).catch(err => {
          logger.error({ err }, 'Failed to send PeerLine chat push notification');
        });
      }
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

  /**
   * LEGACY: endSession kept for existing completed sessions. In the new model,
   * connections don't end — they remain open. This is preserved for admin tools.
   */
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
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    // Active connections (accepted, open chats)
    const activeConnections = await prisma.peerLineSession.findMany({
      where: {
        mentorId: userId,
        status: PeerLineStatus.ACTIVE
      },
      orderBy: { createdAt: 'desc' },
      include: {
        mentee: { select: { profile: { select: { displayName: true } } } }
      }
    });

    // Pending connection requests
    const pendingConnections = await prisma.peerLineSession.findMany({
      where: {
        mentorId: userId,
        status: PeerLineStatus.MATCHING
      },
      orderBy: { createdAt: 'asc' },
      include: {
        mentee: { select: { profile: { select: { displayName: true } } } }
      }
    });

    // Total connections (historical)
    const totalConnections = await prisma.peerLineSession.count({
      where: { mentorId: userId }
    });

    // Badge tier based on accepted connections
    const acceptedTotal = await prisma.peerLineSession.count({
      where: { mentorId: userId, status: { in: [PeerLineStatus.ACTIVE, PeerLineStatus.COMPLETED] } }
    });
    let badgeTier = 'Bronze';
    if (acceptedTotal >= 50) badgeTier = 'Gold';
    else if (acceptedTotal >= 10) badgeTier = 'Silver';

    // Build active connections with unread counts
    const activeConnectionsWithUnread = await Promise.all(
      activeConnections.map(async (c) => {
        const unreadCount = await prisma.peerLineMessage.count({
          where: { sessionId: c.id, isRead: false, senderRole: 'mentee' }
        });
        const lastMessage = await prisma.peerLineMessage.findFirst({
          where: { sessionId: c.id },
          orderBy: { sentAt: 'desc' }
        });
        return {
          id: c.id,
          menteeId: c.menteeId,
          mentorId: c.mentorId,
          createdAt: c.createdAt,
          topicIds: c.topicIds,
          status: c.status,
          unreadCount,
          menteeName: c.mentee?.profile?.displayName || 'Teen',
          lastMessage: lastMessage?.content || null,
          lastMessageAt: lastMessage?.sentAt || c.createdAt,
        };
      })
    );

    return {
      totalConnections,
      acceptedTotal,
      badgeTier,
      certificationLevel: profile?.mentorStatus || 'none',
      certifiedTopicIds: profile?.certifiedTopicIds || [],
      pendingRequests: pendingConnections.length,
      isAvailable: profile?.isAvailable ?? false,
      activeConnections: activeConnectionsWithUnread,
      pendingConnectionsList: pendingConnections.map(c => ({
        id: c.id,
        menteeId: c.menteeId,
        createdAt: c.createdAt,
        topicIds: c.topicIds,
        menteeName: c.mentee?.profile?.displayName || 'Teen',
      }))
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

  /**
   * DEPRECATED: claimNextSession is no longer used in the connection model.
   * Teens now send direct connection requests to specific mentors.
   * Kept as stub so existing references don't break.
   */
  async claimNextSession(_mentorId: string) {
    throw new AppError('FEATURE_DEPRECATED: Use connection requests instead', 410);
  }

  /**
   * NEW: Peer mentor accepts a teen's connection request.
   * Activates the connection permanently — the chat is now open forever.
   */
  async acceptConnection(mentorId: string, connectionId: string) {
    const connection = await prisma.peerLineSession.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new AppError('Connection request not found', 404);
    }

    if (connection.mentorId !== mentorId) {
      throw new AppError('Unauthorized: Connection is not assigned to you', 403);
    }

    if (connection.status !== PeerLineStatus.MATCHING) {
      throw new AppError('Connection cannot be accepted in its current state', 400);
    }

    const acceptedConnection = await prisma.peerLineSession.update({
      where: { id: connectionId },
      data: {
        status: PeerLineStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    // Send a default greeting from the peer mentor
    try {
      const greetingContent = "Hey! I accepted your connection request. I'm here to chat anytime 💜";
      const greetingMessage = await prisma.peerLineMessage.create({
        data: {
          sessionId: acceptedConnection.id,
          senderRole: 'mentor',
          content: greetingContent,
          messageType: 'TEXT',
        }
      });

      const socketModule = await import('./peerline.socket.js');
      // Emit the greeting message to both participants
      setTimeout(() => {
        socketModule.nsp?.to(`session_${acceptedConnection.id}`).emit('message', {
          type: 'message',
          ...greetingMessage
        });
      }, 400);

      // Notify the teen that their request was accepted
      await socketModule.broadcastConnectionAccepted(acceptedConnection.id, acceptedConnection.menteeId, mentorId);
    } catch (e) {
      console.error('[PeerLine] Failed to broadcast connection accepted:', e);
    }

    return acceptedConnection;
  }

  /**
   * Backward-compat alias: some old clients call acceptSession
   */
  async acceptSession(mentorId: string, sessionId: string) {
    return this.acceptConnection(mentorId, sessionId);
  }

  /**
   * NEW: Peer mentor declines a teen's connection request.
   */
  async declineConnection(mentorId: string, connectionId: string) {
    const connection = await prisma.peerLineSession.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new AppError('Connection request not found', 404);
    }

    if (connection.mentorId !== mentorId) {
      throw new AppError('Unauthorized: Connection is not assigned to you', 403);
    }

    if (connection.status !== PeerLineStatus.MATCHING) {
      throw new AppError('Only pending connections can be declined', 400);
    }

    // Mark as cancelled so the teen can request again
    const declined = await prisma.peerLineSession.update({
      where: { id: connectionId },
      data: {
        status: PeerLineStatus.CANCELLED,
        endedAt: new Date(),
        endReason: 'mentor_declined',
      }
    });

    // Notify the teen of the decline
    try {
      const socketModule = await import('./peerline.socket.js');
      await socketModule.broadcastConnectionDeclined(connectionId, connection.menteeId);
    } catch (e) {
      console.error('[PeerLine] Failed to broadcast connection declined:', e);
    }

    return declined;
  }

  /**
   * NEW: Teen cancels their own pending connection request.
   */
  async cancelConnection(teenId: string, connectionId: string) {
    const connection = await prisma.peerLineSession.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new AppError('Connection request not found', 404);
    }

    if (connection.menteeId !== teenId) {
      throw new AppError('Unauthorized: You did not create this request', 403);
    }

    if (connection.status !== PeerLineStatus.MATCHING) {
      throw new AppError('Only pending requests can be cancelled', 400);
    }

    // Set to CANCELLED so the teen can request again
    const cancelled = await prisma.peerLineSession.update({
      where: { id: connectionId },
      data: {
        status: PeerLineStatus.CANCELLED,
        endedAt: new Date(),
        endReason: 'mentee_cancelled',
      }
    });

    // Notify the mentor of the cancel so it disappears from their dashboard
    try {
      const socketModule = await import('./peerline.socket.js');
      await socketModule.broadcastConnectionDeclined(connectionId, connection.mentorId || '');
    } catch (e) {
      console.error('[PeerLine] Failed to broadcast connection cancel:', e);
    }

    return cancelled;
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

      const activeSession = activeSessions.find(s => s.mentorId === m.id);

      return {
        id: m.id,
        name: m.profile?.displayName || 'Peer Mentor',
        isOnline,
        unavailableUntil: m.profile?.unavailableUntil,
        rating: 5.0,
        topics: topicNames,
        certifiedTopicIds: m.profile?.certifiedTopicIds || [],
        expertiseTags: [...new Set(expertiseTags)], // Unique tags
        bio: m.profile?.bio || 'Helping girls navigate their journey with empathy and care.',
        experienceCount: m.profile?.completedSessionsCount || 0,
        hasPendingRequest: activeSession ? (activeSession.status === PeerLineStatus.MATCHING) : false,
        sessionId: activeSession ? activeSession.id : null,
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
    if (existingApp && ['submitted', 'certified'].includes(existingApp.certificationStatus)) {
      const error = new AppError('You have already submitted an application. Please wait for the review process.', 400);
      (error as any).details = {
        status: existingApp.status,
        certificationStatus: existingApp.certificationStatus
      };
      throw error;
    }

    const certifiedTopicIds = Array.isArray(input.topicIds)
      ? input.topicIds
      : Array.isArray(input.certifiedTopicIds)
      ? input.certifiedTopicIds
      : [];

    // Ensure profile exists
    let profile = await prisma.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: targetUserId,
          displayName: input.name || 'Peer Applicant',
          mentorStatus: 'applied',
          certifiedTopicIds: certifiedTopicIds
        }
      });
    } else {
      profile = await prisma.profile.update({
        where: { userId: targetUserId },
        data: {
          mentorStatus: 'applied',
          certifiedTopicIds: certifiedTopicIds.length > 0 ? certifiedTopicIds : profile.certifiedTopicIds
        }
      });
    }

    const appUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true }
    });

    if (!appUser) throw new Error('User not found');

    const appName = input.name || appUser.profile?.displayName || 'Peer Applicant';
    const appEmail = input.email || appUser.email || appUser.username || '';
    const appPhone = input.phone ? normalizePhone(input.phone) : (appUser.phone || '');
    const appStatement = input.personalStatement || 'Applied via Dashboard';

    let targetCertStatus = 'pending_training';
    if (existingApp?.certificationStatus) {
      if (existingApp.certificationStatus === 'certified') {
        targetCertStatus = 'certified';
      } else if (existingApp.certificationStatus === 'pending_conduct') {
        targetCertStatus = 'submitted'; // They just submitted the Code of Conduct
      } else {
        targetCertStatus = existingApp.certificationStatus;
      }
    }

    // Save application data
    await prisma.peerApplication.upsert({
      where: { userId: targetUserId },
      update: {
        name: appName,
        email: appEmail,
        phone: appPhone,
        personalStatement: appStatement,
        scenarioResponses: input.scenarioResponses !== undefined ? input.scenarioResponses : (existingApp?.scenarioResponses || []),
        eligibility: {
          ...(input.eligibility || {}),
          age: input.age,
          topicIds: input.topicIds,
        },
        status: 'pending',
        certificationStatus: targetCertStatus
      },
      create: {
        userId: targetUserId,
        name: appName,
        email: appEmail,
        phone: appPhone,
        personalStatement: appStatement,
        scenarioResponses: input.scenarioResponses || [],
        eligibility: {
          ...(input.eligibility || {}),
          age: input.age,
          topicIds: input.topicIds,
        },
        status: 'pending',
        certificationStatus: 'pending_training'
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
      // Everyone must sign the Code of Conduct upon passing the assessment
      status = 'pending_conduct';
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

    // Self-heal: If marked submitted before actually taking the assessment, revert to pending_training
    if (app.certificationStatus === 'submitted' && app.trainingScore === null) {
      await prisma.peerApplication.update({
        where: { userId },
        data: { certificationStatus: 'pending_training' }
      });
      app.certificationStatus = 'pending_training';
    }

    return app;
  }

  async getTrainingCourse() {
    return prisma.peerLineCertificationCourse.findUnique({
      where: { slug: 'peerline-mentor-certification' },
      include: {
        episodes: {
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  async getTrainingEpisode(episodeSlug: string) {
    return prisma.peerLineCertificationEpisode.findUnique({
      where: { slug: episodeSlug }
    });
  }
}


