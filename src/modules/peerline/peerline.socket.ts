import { Namespace, Server, Socket } from 'socket.io';
import { logger } from '../../config/logger.js';
import { PeerLineService } from './peerline.service.js';
import { socketAuthMiddleware } from '../../common/middleware/socketAuth.js';

let nsp: Namespace;
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
      // Send initial queue count
      const stats = await getPeerLineService().getMentorStats((socket as any).userId);
      socket.emit('queue_count_update', { count: stats.queueCount });
    });

    socket.on('unsubscribe_mentor_updates', () => {
      socket.leave('mentor_updates');
    });

    socket.on('subscribe_session', (sessionId: string) => {
      socket.join(`session_${sessionId}`);
      logger.info({ socketId: socket.id, sessionId }, 'Socket joined session channel');
      getPeerLineService().getQueuePosition((socket as any).userId, sessionId).then(queueInfo => {
        socket.emit('queue_position_update', queueInfo);
      }).catch(() => {
        // Silently fail if not mentee or not found
      });
    });

    socket.on('unsubscribe_session', (sessionId: string) => {
      socket.leave(`session_${sessionId}`);
    });

    socket.on('send_message', async (data: { sessionId: string; content: string; senderRole: 'mentee' | 'mentor'; clientId?: string }) => {
      try {
        const uid = (socket as any).userId;
        logger.info({ uid, data }, 'Received send_message on socket');
        const message = await getPeerLineService().createMessage(uid, data.sessionId, data.content, data.senderRole);

        logger.info({ sessionId: data.sessionId, messageId: message.id }, 'Message created, broadcasting to room');
        const { sessionId: _sId, ...msgRest } = message;
        nsp.to(`session_${data.sessionId}`).emit('message', { 
          type: 'message', 
          sessionId: data.sessionId,
          clientId: data.clientId, 
          ...msgRest 
        });

        if (message.crisisFlag) {
          const resources = await new (await import('../safety/safety.service.js')).SafetyService().getCrisisResources('en-IN');
          nsp.to(`session_${data.sessionId}`).emit('crisis_resource', { severity: 'HIGH', ...resources });
        }
      } catch (error: any) {
        if (error.message === 'PII_BLOCKED') {
          socket.emit('error', { type: 'PII_BLOCKED', message: "For safety, let's keep our conversations here in PeerLine." });
        } else {
          logger.error({ error, data }, 'Failed to process message');
        }
      }
    });

    socket.on('typing_indicator', (data: { sessionId: string; isTyping: boolean; senderRole: string }) => {
      socket.to(`session_${data.sessionId}`).emit('peer_typing', { isTyping: data.isTyping, senderRole: data.senderRole });
    });

    socket.on('typing_stop', (data: { sessionId: string; senderRole: string }) => {
      socket.to(`session_${data.sessionId}`).emit('peer_typing', { isTyping: false, senderRole: data.senderRole });
    });

    socket.on('delete_message', async (data: { sessionId: string; messageId: string }) => {
      try {
        const uid = (socket as any).userId;
        await getPeerLineService().deleteMessage(uid, data.messageId);
        nsp.to(`session_${data.sessionId}`).emit('message_deleted', { messageId: data.messageId, sessionId: data.sessionId });
      } catch (error) {
        logger.error({ error, data }, 'Failed to delete message via socket');
      }
    });

    socket.on('end_session', async (data: { sessionId: string; reason: string }) => {
      try {
        const uid = (socket as any).userId;
        await getPeerLineService().endSession(uid, data.sessionId);
        nsp.to(`session_${data.sessionId}`).emit('session_ended', { reason: data.reason });
      } catch (error) {
        logger.error({ error, data }, 'Failed to end session via socket');
      }
    });

    socket.on('pause_session', (data: { sessionId: string }) => {
      nsp.to(`session_${data.sessionId}`).emit('session_paused', { timestamp: new Date() });
    });
  });
}

export async function broadcastSessionUpdate(sessionId: string, userId: string) {
  if (!nsp) return;
  try {
    const queueInfo = await getPeerLineService().getQueuePosition(userId, sessionId);
    nsp.to(`session_${sessionId}`).emit('queue_position_update', queueInfo);
  } catch (error) {
    logger.error({ sessionId, error }, 'Failed to broadcast session update');
  }
}

export async function broadcastAvailabilityUpdate() {
  if (!nsp) return;
  try {
    const availability = await getPeerLineService().getAvailability();
    nsp.to('availability_updates').emit('mentor_availability_update', availability);
  } catch (error) {
    logger.error({ error }, 'Failed to broadcast availability update');
  }
}

export async function broadcastSessionReady(sessionId: string, menteeId: string) {
  if (!nsp) return;
  nsp.to(`session_${sessionId}`).emit('session_ready', { sessionId });
  nsp.to(`user_${menteeId}`).emit('session_ready', { sessionId });
  logger.info({ sessionId, menteeId }, 'Broadcasted session ready');
}

export async function broadcastQueueUpdate() {
  if (!nsp) return;
  try {
    // This is a simplified version. For true accuracy, we'd need to emit per topic.
    // For now, we broadcast a general update alert, and mentors fetch their specific count.
    nsp.to('mentor_updates').emit('queue_count_changed');
  } catch (error) {
    logger.error({ error }, 'Failed to broadcast queue update');
  }
}
