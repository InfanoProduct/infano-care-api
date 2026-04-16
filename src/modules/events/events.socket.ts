import { Namespace, Server, Socket } from 'socket.io';
import { logger } from '../../config/logger.js';
import { socketAuthMiddleware } from '../../common/middleware/socketAuth.js';

let nsp: Namespace;

export function setupEventsSocket(serverIo: Server) {
  nsp = serverIo.of('/events');
  nsp.use(socketAuthMiddleware);

  nsp.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info({ userId, socketId: socket.id }, 'User connected to /events Socket Namespace');

    socket.on('error', (err) => {
      logger.error({ socketId: socket.id, err }, 'Socket encountered an error');
    });

    socket.on('subscribe_event', (eventId: string) => {
      socket.join(`events_${eventId}`);
      logger.info({ socketId: socket.id, eventId }, 'Socket joined event channel');
    });

    socket.on('unsubscribe_event', (eventId: string) => {
      socket.leave(`events_${eventId}`);
      logger.info({ socketId: socket.id, eventId }, 'Socket left event channel');
    });

    socket.on('disconnect', () => {
      logger.info({ userId, socketId: socket.id }, 'User disconnected from /events');
    });
  });
}

/**
 * Broadcasts a moderated question/answer to all users in the event room.
 */
export async function broadcastEventUpdate(eventId: string, payload: { type: string; data: any }) {
  if (!nsp) return;
  
  logger.info({ eventId, type: payload.type }, 'Broadcasting event update');
  nsp.to(`events_${eventId}`).emit('event_update', payload);
}

/**
 * Broadcasts the updated question count.
 */
export async function broadcastQuestionCount(eventId: string, count: number) {
  if (!nsp) return;
  
  nsp.to(`events_${eventId}`).emit('question_count_update', { eventId, count });
}
