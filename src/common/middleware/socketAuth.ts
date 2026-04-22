import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { Socket } from 'socket.io';

import { logger } from '../../config/logger.js';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  if (!token) {
    logger.warn({ socketId: socket.id }, 'Socket auth failed: Token missing');
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    (socket as any).userId = decoded.sub || decoded.id;
    next();
  } catch (err) {
    logger.warn({ socketId: socket.id, err }, 'Socket auth failed: Invalid token');
    next(new Error('Authentication error: Invalid token'));
  }
}
