import { Namespace, Server, Socket } from 'socket.io';
import { logger } from '../../config/logger.js';
import { PeerLineService } from './peerline.service.js';
import { socketAuthMiddleware } from '../../common/middleware/socketAuth.js';

export let nsp: Namespace;
let peerLineService: PeerLineService;

function getPeerLineService() {
  if (!peerLineService) {
    peerLineService = new PeerLineService();
  }
  return peerLineService;
}

export function setupPeerLineSocket(serverIo: Server) {
  nsp = serverIo.of('/peerline');
  nsp.use(socketAuthMiddleware);

  nsp.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info({ userId, socketId: socket.id }, 'User connected to /peerline Socket Namespace');
    if (userId) {
      socket.join(`user_${userId}`);
    }

    socket.on('error', (err) => {
      logger.error({ socketId: socket.id, err }, 'Socket encountered an error');
    });

    socket.on('subscribe_availability', () => {
      socket.join('availability_updates');
      logger.info({ socketId: socket.id }, 'Socket joined availability_updates channel');
      getPeerLineService().getAvailability().then(availability => {
        socket.emit('mentor_availability_update', availability);
      });
    });

    socket.on('unsubscribe_availability', () => {
      socket.leave('availability_updates');
    });

    socket.on('subscribe_mentor_updates', async () => {
      socket.join('mentor_updates');
      logger.info({ socketId: socket.id }, 'Socket joined mentor_updates channel');
      // Send initial pending requests count
      const uid = (socket as any).userId;
      try {
        const stats = await getPeerLineService().getMentorStats(uid);
        socket.emit('pending_requests_update', { count: stats.pendingRequests });
      } catch (e) {
        // silently fail if not a mentor
      }
    });

    socket.on('unsubscribe_mentor_updates', () => {
      socket.leave('mentor_updates');
    });

    // Subscribe to a chat connection room (teen-peer pair)
    socket.on('subscribe_session', (connectionId: string) => {
      socket.join(`session_${connectionId}`);
      logger.info({ socketId: socket.id, connectionId }, 'Socket joined connection channel');
    });

    socket.on('read_messages', async (data: { sessionId: string }) => {
      try {
        const uid = (socket as any).userId;
        await getPeerLineService().markAsRead(uid, data.sessionId);
        nsp.to(`session_${data.sessionId}`).emit('messages_read', {
          type: 'messages_read',
          sessionId: data.sessionId,
          readerId: uid,
        });
      } catch (err) {
        logger.error({ err, data }, 'Failed to mark peerline messages as read via socket');
      }
    });

    socket.on('unsubscribe_session', (connectionId: string) => {
      socket.leave(`session_${connectionId}`);
    });

    // ─── Messaging ────────────────────────────────────────────────────────────

    socket.on('send_message', async (data: {
      sessionId: string;
      content: string | null;
      senderRole: 'mentee' | 'mentor';
      messageType?: 'TEXT' | 'VOICE' | 'IMAGE';
      mediaUrl?: string;
      clientId?: string;
    }) => {
      try {
        const uid = (socket as any).userId;
        logger.info({ uid, data }, 'Received send_message on socket');
        const message = await getPeerLineService().createMessage(
          uid, data.sessionId, data.content, data.senderRole, data.messageType, data.mediaUrl
        );

        const session = await getPeerLineService().getSession(uid, data.sessionId);
        // Find all session/connection records between this mentee and mentor to broadcast to all active rooms they might be in
        let targetRooms = [`session_${data.sessionId}`];
        if (session.menteeId && session.mentorId) {
          const pairSessions = await getPeerLineService().getPairSessions(session.menteeId, session.mentorId);
          targetRooms = pairSessions.map(sId => `session_${sId}`);
        }

        logger.info({ connectionId: data.sessionId, messageId: message.id, rooms: targetRooms }, 'Message created, broadcasting to all pair rooms');
        const { sessionId: _sId, ...msgRest } = message;
        for (const room of targetRooms) {
          nsp.to(room).emit('message', {
            type: 'message',
            sessionId: data.sessionId,
            clientId: data.clientId,
            ...msgRest
          });
        }

        const recipientId = data.senderRole === 'mentee' ? session.mentorId : session.menteeId;
        if (recipientId) {
          nsp.to(`user_${recipientId}`).emit('message', {
            type: 'message',
            sessionId: data.sessionId,
            clientId: data.clientId,
            ...msgRest
          });
        }

        if (message.crisisFlag) {
          const resources = await new (await import('../safety/safety.service.js')).SafetyService().getCrisisResources('en-IN');
          for (const room of targetRooms) {
            nsp.to(room).emit('crisis_resource', { severity: 'HIGH', ...resources });
          }
        }
      } catch (error: any) {
        if (error.message === 'PII_BLOCKED') {
          socket.emit('error', { type: 'PII_BLOCKED', message: "For safety, let's keep our conversations here in PeerLine." });
        } else {
          logger.error({ error, data }, 'Failed to process message');
          socket.emit('error', { type: 'MESSAGE_ERROR', message: error.message || 'Failed to send message' });
        }
      }
    });

    socket.on('typing_indicator', (data: { sessionId: string; isTyping: boolean; senderRole: string }) => {
      socket.to(`session_${data.sessionId}`).emit('peer_typing', {
        isTyping: data.isTyping,
        senderRole: data.senderRole,
      });
    });

    socket.on('delete_message', async (data: { sessionId: string; messageId: string }) => {
      try {
        const uid = (socket as any).userId;
        await getPeerLineService().deleteMessage(uid, data.messageId);
        nsp.to(`session_${data.sessionId}`).emit('message_deleted', {
          messageId: data.messageId,
          sessionId: data.sessionId,
        });
      } catch (error) {
        logger.error({ error, data }, 'Failed to delete message via socket');
      }
    });
  });
}

// ─── Broadcast Helpers ────────────────────────────────────────────────────────

export async function broadcastAvailabilityUpdate() {
  if (!nsp) return;
  try {
    const availability = await getPeerLineService().getAvailability();
    nsp.to('availability_updates').emit('mentor_availability_update', availability);
  } catch (error) {
    logger.error({ error }, 'Failed to broadcast availability update');
  }
}

/**
 * Broadcast to the teen that their connection request was accepted.
 * Navigates them directly into the chat.
 */
export async function broadcastConnectionAccepted(connectionId: string, teenId: string, mentorId: string) {
  if (!nsp) return;
  nsp.to(`session_${connectionId}`).emit('connection_accepted', { connectionId, mentorId });
  nsp.to(`user_${teenId}`).emit('connection_accepted', { connectionId, mentorId });
  logger.info({ connectionId, teenId, mentorId }, 'Broadcasted connection_accepted');
}

/**
 * Broadcast to the teen that their connection request was declined.
 */
export async function broadcastConnectionDeclined(connectionId: string, teenId: string) {
  if (!nsp) return;
  nsp.to(`user_${teenId}`).emit('connection_declined', { connectionId });
  logger.info({ connectionId, teenId }, 'Broadcasted connection_declined');
}

/**
 * Notify a specific mentor of a new incoming connection request.
 */
export async function broadcastConnectionRequest(connectionId: string, mentorId: string) {
  if (!nsp) return;
  nsp.to(`user_${mentorId}`).emit('connection_request', { connectionId });
  nsp.to('mentor_updates').emit('pending_requests_update', {});
  logger.info({ connectionId, mentorId }, 'Broadcasted connection_request to mentor');
}

// Legacy — kept so import references in old code don't crash
export async function broadcastSessionReady(sessionId: string, menteeId: string) {
  if (!nsp) return;
  nsp.to(`user_${menteeId}`).emit('connection_accepted', { connectionId: sessionId });
}

export async function broadcastQueueUpdate() {
  // No-op in new model (no queue)
}

export async function broadcastDirectRequest(sessionId: string, mentorId: string) {
  return broadcastConnectionRequest(sessionId, mentorId);
}
