import { Server, Socket, Namespace } from 'socket.io';
import { logger } from '../../config/logger.js';
import { socketAuthMiddleware } from '../../common/middleware/socketAuth.js';
import { FriendsChatService } from './friends.chat.service.js';

let friendsNsp: Namespace | null = null;
let chatService: FriendsChatService;

function getChatService() {
  if (!chatService) {
    chatService = new FriendsChatService();
  }
  return chatService;
}

export function setupFriendsSocket(io: Server) {
  friendsNsp = io.of('/friends');
  
  friendsNsp.use(socketAuthMiddleware);

  friendsNsp.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info({ userId, socketId: socket.id }, 'User connected to Friends Socket');

    socket.join(`user:${userId}`);

    socket.on('subscribe_chat', (matchId: string) => {
      socket.join(`match_${matchId}`);
      logger.info({ userId, matchId }, 'Joined friend chat room');
    });

    socket.on('unsubscribe_chat', (matchId: string) => {
      socket.leave(`match_${matchId}`);
    });

    socket.on('send_message', async (data: { matchId: string; content: string; clientId?: string }) => {
      try {
        const uid = (socket as any).userId;
        const result = await getChatService().createMessage(uid, data.matchId, data.content);

        // Broadcast message to both users in the match room
        const { matchId: _mId, ...msgRest } = result.message;
        friendsNsp?.to(`match_${data.matchId}`).emit('message', {
          type: 'message',
          matchId: data.matchId,
          clientId: data.clientId,
          ...msgRest
        });

        // Handle GPD safety signals
        if (result.gpdStatus === 'WARNING') {
          socket.emit('grooming_check', { 
            text: "Friendly reminder: We recommend keeping all chats within the app for your safety. 💜" 
          });
        } else if (result.gpdStatus === 'SUSPENDED') {
          friendsNsp?.to(`match_${data.matchId}`).emit('safety_alert', {
            severity: 'suspended',
            message: 'This chat has been temporarily suspended for a safety review. Please stay safe!'
          });
        }
      } catch (error: any) {
        if (error.statusCode === 422 || error.statusCode === 403) {
          socket.emit('safety_alert', { severity: 'warning', message: error.message });
        } else {
          logger.error({ error, data }, 'Failed to process friend message');
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    });

    socket.on('typing_indicator', (data: { matchId: string; isTyping: boolean }) => {
      socket.to(`match_${data.matchId}`).emit('peer_typing', { 
        matchId: data.matchId, 
        isTyping: data.isTyping 
      });
    });

    socket.on('disconnect', () => {
      logger.info({ userId }, 'User disconnected from Friends Socket');
    });
  });
}

export function emitFriendMatch(userId: string, payload: any) {
  if (!friendsNsp) {
    logger.warn('Friends Socket not initialized. Cannot emit friend_match event.');
    return;
  }
  friendsNsp.to(`user:${userId}`).emit('friend_match', payload);
}
