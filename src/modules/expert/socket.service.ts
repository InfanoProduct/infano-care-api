import { Server, Socket } from 'socket.io';
import { ExpertService } from './expert.service.js';
import { logger } from '../../config/logger.js';
import { socketAuthMiddleware } from '../../common/middleware/socketAuth.js';

const expertService = new ExpertService();

export function setupExpertSocket(io: Server) {
  // Expert chat uses the root namespace (clients connect to root)
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info({ userId, socketId: socket.id }, 'User connected to Expert Chat Socket');

    socket.on('join_session', ({ sessionId }) => {
      socket.join(sessionId);
      logger.info({ userId, sessionId }, 'User joined expert chat room');
    });

    socket.on('send_message', async ({ sessionId, content }) => {
      logger.info({ userId, sessionId, content }, 'Socket send_message received');
      try {
        const message = await expertService.saveMessage(sessionId, userId, content);
        io.to(sessionId).emit('new_message', message);
      } catch (error) {
        logger.error({ error, sessionId, userId }, 'Failed to process socket message');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ sessionId, isTyping }) => {
      socket.to(sessionId).emit('user_typing', { userId, isTyping });
    });

    socket.on('disconnect', () => {
      logger.info({ userId }, 'User disconnected from Expert Chat Socket');
    });
  });
}
