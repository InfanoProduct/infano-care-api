import { Server, Socket } from 'socket.io';
import { ExpertService } from './expert.service.js';
import { logger } from '../../config/logger.js';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const expertService = new ExpertService();

export function setupExpertSocket(io: Server) {
  io.use((socket, next) => {
    logger.info({ auth: socket.handshake.auth }, 'Socket connection attempt incoming');
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      (socket as any).userId = decoded.sub || decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info({ userId, socketId: socket.id }, 'User connected to Expert Chat Socket');

    /**
     * Join a specific chat room (sessionId)
     */
    socket.on('join_session', ({ sessionId }) => {
      socket.join(sessionId);
      logger.info({ userId, sessionId }, 'User joined expert chat room');
    });

    /**
     * Handle incoming message
     */
    socket.on('send_message', async ({ sessionId, content }) => {
      logger.info({ userId, sessionId, content }, 'Socket send_message received');
      try {
        // Save to Database
        const message = await expertService.saveMessage(sessionId, userId, content);

        // Broadcast to everyone in the room (including sender if they have multiple devices)
        io.to(sessionId).emit('new_message', message);
      } catch (error) {
        logger.error({ error, sessionId, userId }, 'Failed to process socket message');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicators
     */
    socket.on('typing', ({ sessionId, isTyping }) => {
      socket.to(sessionId).emit('user_typing', { userId, isTyping });
    });

    socket.on('disconnect', () => {
      logger.info({ userId }, 'User disconnected from Expert Chat Socket');
    });
  });
}
