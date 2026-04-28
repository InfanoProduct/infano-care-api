import { prisma } from '../../db/client.js';
import { MatchStatus } from '@prisma/client';
import { AppError } from '../../common/middleware/errorHandler.js';
import { logger } from '../../config/logger.js';

export class FriendsChatService {
  async getMessages(userId: string, matchId: string, page = 1, perPage = 50) {
    // Verify access
    const match = await prisma.friendMatch.findUnique({
      where: { id: matchId },
      include: {
        user: true,
        target: true,
      },
    });

    if (!match || (match.user.userId !== userId && match.target.userId !== userId)) {
      throw new AppError('Unauthorized access to chat', 403);
    }

    const messages = await prisma.friendMessage.findMany({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    // Mark as read for the recipient
    await prisma.friendMessage.updateMany({
      where: {
        matchId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Get the other person's profile
    const otherProfile = match.user.userId === userId ? match.target : match.user;

    return {
      messages: messages.reverse(),
      match: {
        id: otherProfile.id,
        userId: otherProfile.userId,
        nickname: otherProfile.nickname,
        photoUrl: otherProfile.photoUrl,
        vibeTags: otherProfile.vibeTags,
      },
    };
  }

  async createMessage(userId: string, matchId: string, content: string): Promise<{ message: any, gpdStatus: 'OK' | 'WARNING' | 'SUSPENDED' }> {
    const match = await prisma.friendMatch.findUnique({
      where: { id: matchId },
      include: { user: true, target: true },
    });

    if (!match || (match.user.userId !== userId && match.target.userId !== userId)) {
      throw new AppError('Unauthorized', 403);
    }

    if (match.status !== MatchStatus.MATCHED) {
      throw new AppError('Chat is only available for matched friends', 400);
    }

    // 1. Safety Monitoring (PII)
    const piiError = this.scanForPII(content);
    if (piiError) {
      throw new AppError(piiError, 422);
    }

    // 2. Grooming Pattern Detector (GPD)
    const gpdStatus = await this.runGPD(matchId, content);
    if (gpdStatus === 'SUSPENDED') {
      throw new AppError('This chat has been suspended for safety review.', 403);
    }

    // 3. Create message
    const message = await prisma.friendMessage.create({
      data: {
        matchId,
        senderId: userId,
        content,
      },
    });

    return {
      message,
      gpdStatus,
    };
  }

  scanForPII(content: string): string | null {
    const phoneRegex = /(\+?\d{1,4}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const socialRegex = /(@[a-zA-Z0-9_]{3,20})/g; // Simple handle detection

    if (phoneRegex.test(content) || emailRegex.test(content) || socialRegex.test(content)) {
      return "For your safety, let's keep our connection here in the app for now.";
    }
    if (urlRegex.test(content)) {
      return "Links aren't supported in chats right now.";
    }
    return null;
  }

  async runGPD(matchId: string, newContent: string): Promise<'OK' | 'WARNING' | 'SUSPENDED'> {
    // Fetch last 20 messages
    const lastMessages = await prisma.friendMessage.findMany({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
      take: 19,
    });

    const conversation = [...lastMessages.map(m => m.content), newContent].join('\n');
    
    // Pattern detection
    let score = 0;
    
    const patterns = [
      { regex: /address|school|live|where|location|street/gi, weight: 0.1 },
      { regex: /don't tell|our secret|between us|secretly/gi, weight: 0.25 },
      { regex: /you have to|if you really|trust me/gi, weight: 0.15 },
      { regex: /how old|are you really|age|born/gi, weight: 0.1 },
    ];

    patterns.forEach(p => {
      const matches = conversation.match(p.regex);
      if (matches) {
        score += p.weight * Math.min(matches.length, 3);
      }
    });

    if (score >= 0.8) {
      // Suspend chat
      logger.warn({ matchId, score }, 'Grooming pattern detected: SUSPENDING CHAT');
      return 'SUSPENDED';
    } else if (score >= 0.65) {
      // Queue for human review
      logger.info({ matchId, score }, 'Grooming pattern warning: Human review queued');
      return 'WARNING';
    }

    return 'OK';
  }

  async reportMatch(userId: string, matchId: string, data: { reason: string; note?: string }) {
    const match = await prisma.friendMatch.findUnique({
      where: { id: matchId },
      include: { user: true, target: true },
    });

    if (!match || (match.user.userId !== userId && match.target.userId !== userId)) {
      throw new AppError('Match not found', 404);
    }

    // Log the report
    await prisma.moderationLog.create({
      data: {
        contentId: matchId,
        contentType: 'FRIEND_MATCH',
        layer: 'HUMAN_REPORT',
        decision: 'HOLD',
        reasonCode: data.reason,
      },
    });

    return { acknowledged: true };
  }

  async blockMatch(userId: string, matchId: string) {
    const match = await prisma.friendMatch.findUnique({
      where: { id: matchId },
      include: { user: true, target: true },
    });

    if (!match || (match.user.userId !== userId && match.target.userId !== userId)) {
      throw new AppError('Match not found', 404);
    }

    // Update status to UNMATCHED
    await prisma.friendMatch.update({
      where: { id: matchId },
      data: { status: MatchStatus.UNMATCHED },
    });

    return { blocked: true, match_removed: true };
  }
}
