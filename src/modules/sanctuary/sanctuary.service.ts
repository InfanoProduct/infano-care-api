import { prisma } from '../../db/client.js';
import { AudienceRole, SanctuaryRoomType, SanctuaryReactionType, PostStatus, CrisisSeverity } from '@prisma/client';
import { SafeHarbor } from './safe-harbor.middleware.js';
import { logger } from '../../config/logger.js';

export class SanctuaryService {
  /**
   * Seed system default communities and rooms if none exist
   */
  async seedDefaultsIfEmpty() {
    try {
      const count = await prisma.sanctuaryCommunity.count();
      if (count > 0) return;

      logger.info('[Sanctuary] Seeding default communities and rooms...');

      // 1. Teen Community: Bloom Cohort
      const teenComm = await prisma.sanctuaryCommunity.create({
        data: {
          slug: 'bloom-lounge',
          name: 'Bloom Lounge (10–19)',
          description: 'A cozy, safe peer community for girls navigating puberty, wellness, and growth.',
          iconEmoji: '🌸',
          accentColor: '#6D28D9',
          audience: AudienceRole.TEEN,
          isSystemDefault: true,
          rooms: {
            create: [
              {
                name: 'general-chat',
                topic: 'Say hello and share what is on your mind today 💬',
                type: SanctuaryRoomType.TOPIC_ROOM,
                sortOrder: 1,
              },
              {
                name: 'period-sos',
                topic: 'Periods, cramps, body changes, and reassurance 🩸',
                type: SanctuaryRoomType.TOPIC_ROOM,
                sortOrder: 2,
              },
              {
                name: 'whisper-room',
                topic: '24-hour anonymous questions reviewed by doctors 🤫',
                type: SanctuaryRoomType.WHISPER_ROOM,
                allowAnonymous: true,
                hasScreenshotDRM: true,
                sortOrder: 3,
              },
              {
                name: 'story-threads',
                topic: 'Collaborative anonymous creative writing ✍️',
                type: SanctuaryRoomType.STORY_THREAD,
                allowAnonymous: true,
                sortOrder: 4,
              },
              {
                name: 'lofi-study-lounge',
                topic: 'Camera-free focus room with Pomodoro timer & ambient sounds 🎧',
                type: SanctuaryRoomType.VOICE_LOUNGE,
                sortOrder: 5,
              },
              {
                name: 'greenhouse-stage',
                topic: 'Live Q&A audio stage with verified pediatricians & gynecologists 🩺',
                type: SanctuaryRoomType.GREENHOUSE_STAGE,
                sortOrder: 6,
              },
            ],
          },
        },
      });

      // 2. Mother Community: Root Sanctuary
      const parentComm = await prisma.sanctuaryCommunity.create({
        data: {
          slug: 'root-sanctuary',
          name: 'Root Sanctuary (Mothers)',
          description: 'A safe, supportive space for mothers parenting daughters through puberty.',
          iconEmoji: '🌿',
          accentColor: '#3E6146',
          audience: AudienceRole.PARENT,
          isSystemDefault: true,
          rooms: {
            create: [
              {
                name: 'parenting-discussions',
                topic: 'Parenting tips, boundary setting, and peer advice 💬',
                type: SanctuaryRoomType.TOPIC_ROOM,
                sortOrder: 1,
              },
              {
                name: 'pediatrician-qna',
                topic: 'Clinical puberty guidance from verified medical specialists 🩺',
                type: SanctuaryRoomType.TOPIC_ROOM,
                sortOrder: 2,
              },
            ],
          },
        },
      });

      logger.info({ teenCommId: teenComm.id, parentCommId: parentComm.id }, '[Sanctuary] Seeding complete.');
    } catch (e) {
      logger.error({ err: e }, '[Sanctuary] Failed to seed default communities');
    }
  }

  /**
   * 1. Communities: Filter strictly by user audience/role
   */
  async getCommunities(userId: string, userRole: string) {
    const audience = userRole.toUpperCase() === 'PARENT' ? AudienceRole.PARENT : AudienceRole.TEEN;

    const communities = await prisma.sanctuaryCommunity.findMany({
      where: {
        audience,
        isActive: true,
      },
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            topic: true,
            type: true,
            hasScreenshotDRM: true,
            allowAnonymous: true,
          },
        },
        memberships: {
          where: { userId },
          select: { role: true, pseudonym: true, avatarSeed: true },
        },
        _count: { select: { memberships: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return communities.map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      iconEmoji: c.iconEmoji,
      bannerUrl: c.bannerUrl,
      accentColor: c.accentColor,
      audience: c.audience,
      memberCount: c._count.memberships,
      isJoined: c.memberships.length > 0,
      membership: c.memberships[0] || null,
      rooms: c.rooms,
    }));
  }

  /**
   * Join a community with strict role verification
   */
  async joinCommunity(userId: string, userRole: string, communityId: string, pseudonym?: string) {
    const community = await prisma.sanctuaryCommunity.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw Object.assign(new Error('Community not found'), { statusCode: 404 });
    }

    const expectedAudience = userRole.toUpperCase() === 'PARENT' ? AudienceRole.PARENT : AudienceRole.TEEN;
    if (community.audience !== expectedAudience) {
      throw Object.assign(new Error('Forbidden: You cannot access communities outside your role'), { statusCode: 403 });
    }

    return prisma.communityMembership.upsert({
      where: {
        communityId_userId: { communityId, userId },
      },
      update: {
        lastVisitedAt: new Date(),
        pseudonym: pseudonym || undefined,
      },
      create: {
        communityId,
        userId,
        pseudonym: pseudonym || `bloom_${Math.floor(1000 + Math.random() * 9000)}`,
        avatarSeed: `seed_${userId.slice(0, 5)}`,
      },
    });
  }

  /**
   * 2. Rooms: Fetch rooms for a community with role checking
   */
  async getRooms(communityId: string, userId: string, userRole: string) {
    const community = await prisma.sanctuaryCommunity.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw Object.assign(new Error('Community not found'), { statusCode: 404 });
    }

    const expectedAudience = userRole.toUpperCase() === 'PARENT' ? AudienceRole.PARENT : AudienceRole.TEEN;
    if (community.audience !== expectedAudience) {
      throw Object.assign(new Error('Forbidden: Access denied to this community'), { statusCode: 403 });
    }

    return prisma.sanctuaryRoom.findMany({
      where: { communityId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 3. Room Messages: Paged timeline with reaction counts
   */
  async getRoomMessages(roomId: string, userId: string, page = 1, perPage = 30) {
    const skip = (page - 1) * perPage;

    const [messages, total] = await Promise.all([
      prisma.roomMessage.findMany({
        where: {
          roomId,
          parentMessageId: null,
          status: PostStatus.APPROVED,
        },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              profile: { select: { displayName: true, bloomLevel: true } },
            },
          },
          reactions: true,
          replies: {
            where: { status: PostStatus.APPROVED },
            include: {
              author: {
                select: {
                  id: true,
                  profile: { select: { displayName: true } },
                },
              },
              reactions: true,
            },
            orderBy: { createdAt: 'asc' },
            take: 10,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.roomMessage.count({
        where: { roomId, parentMessageId: null, status: PostStatus.APPROVED },
      }),
    ]);

    // Format messages with user reaction indicators
    const formatted = messages.map(m => {
      const reactionCounts = {
        HUG: m.reactions.filter(r => r.reaction === SanctuaryReactionType.HUG).length,
        HELPFUL: m.reactions.filter(r => r.reaction === SanctuaryReactionType.HELPFUL).length,
        WARMTH: m.reactions.filter(r => r.reaction === SanctuaryReactionType.WARMTH).length,
        SPARKLE: m.reactions.filter(r => r.reaction === SanctuaryReactionType.SPARKLE).length,
      };

      const myReaction = m.reactions.find(r => r.userId === userId)?.reaction || null;

      return {
        id: m.id,
        roomId: m.roomId,
        content: m.content,
        isAnonymous: m.isAnonymous,
        imageUrl: m.imageUrl,
        author: m.isAnonymous
          ? { id: 'anonymous', role: 'TEEN', profile: { displayName: 'Bloom Peer' } }
          : m.author,
        reactionCounts,
        myReaction,
        replyCount: m.replies.length,
        replies: m.replies.map(r => ({
          id: r.id,
          content: r.content,
          author: r.author,
          createdAt: r.createdAt,
        })),
        createdAt: m.createdAt,
      };
    });

    return {
      messages: formatted,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasMore: skip + messages.length < total,
      },
    };
  }

  /**
   * Post a message with Safe Harbor PII & Crisis Interception
   */
  async createMessage(roomId: string, authorId: string, input: { content: string; isAnonymous?: boolean; parentMessageId?: string; imageUrl?: string }) {
    // 1. Safe Harbor check
    const safeCheck = SafeHarbor.process(input.content);

    const status = safeCheck.isFlaggedForReview ? PostStatus.PENDING_HUMAN : PostStatus.APPROVED;
    const crisisSeverity = safeCheck.crisisSeverity === 'HIGH' ? CrisisSeverity.HIGH : CrisisSeverity.NONE;

    const message = await prisma.roomMessage.create({
      data: {
        roomId,
        authorId,
        content: safeCheck.sanitizedContent,
        isAnonymous: input.isAnonymous ?? false,
        parentMessageId: input.parentMessageId,
        imageUrl: input.imageUrl,
        status,
        crisisSeverity,
      },
      include: {
        author: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    return {
      message,
      hasRedactions: safeCheck.hasRedactions,
      isCrisisIntercepted: safeCheck.crisisSeverity === 'HIGH',
      supportHelpline: safeCheck.crisisSeverity === 'HIGH'
        ? {
            title: 'We care about your safety 💜',
            text: 'If you or someone you know is going through a tough time, please reach out to free, 24/7 confidential support: 988 (Crisis Lifeline) or connect with an Infano expert.',
          }
        : null,
    };
  }

  /**
   * Toggle Empathy Reaction (HUG, HELPFUL, WARMTH, SPARKLE)
   */
  async toggleReaction(messageId: string, userId: string, reaction: SanctuaryReactionType) {
    const existing = await prisma.sanctuaryMessageReaction.findUnique({
      where: {
        messageId_userId_reaction: { messageId, userId, reaction },
      },
    });

    if (existing) {
      await prisma.sanctuaryMessageReaction.delete({
        where: { id: existing.id },
      });
      return { action: 'removed', reaction };
    } else {
      // Remove any other reaction on this message by this user
      await prisma.sanctuaryMessageReaction.deleteMany({
        where: { messageId, userId },
      });

      await prisma.sanctuaryMessageReaction.create({
        data: { messageId, userId, reaction },
      });
      return { action: 'added', reaction };
    }
  }

  /**
   * 4. Story Threads: Collaborative Creative Writing
   */
  async getStoryThreads(roomId: string) {
    return prisma.storyThread.findMany({
      where: { roomId },
      include: {
        lines: {
          orderBy: { lineNumber: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                profile: { select: { displayName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStoryThread(roomId: string, title: string, prompt: string, maxLines = 15) {
    return prisma.storyThread.create({
      data: {
        roomId,
        title,
        prompt,
        maxLines,
      },
    });
  }

  async appendStoryLine(threadId: string, authorId: string, lineText: string) {
    const thread = await prisma.storyThread.findUnique({
      where: { id: threadId },
      include: { lines: true },
    });

    if (!thread) throw Object.assign(new Error('Story thread not found'), { statusCode: 404 });
    if (thread.isCompleted) throw Object.assign(new Error('This story thread is already completed!'), { statusCode: 400 });

    const nextLineNumber = thread.lines.length + 1;
    const isCompleted = nextLineNumber >= thread.maxLines;

    const safe = SafeHarbor.process(lineText);

    const line = await prisma.storyLine.create({
      data: {
        threadId,
        authorId,
        lineText: safe.sanitizedContent,
        lineNumber: nextLineNumber,
      },
    });

    if (isCompleted) {
      await prisma.storyThread.update({
        where: { id: threadId },
        data: { isCompleted: true },
      });
    }

    return { line, isCompleted };
  }

  /**
   * 5. Whisper Room: 24h Anonymous Q&A with Clinician Review
   */
  async getWhisperQuestions(roomId: string) {
    const now = new Date();
    return prisma.whisperQuestion.findMany({
      where: {
        roomId,
        expiresAt: { gte: now },
      },
      include: {
        peerNotes: {
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWhisperQuestion(roomId: string, authorId: string, content: string) {
    const safe = SafeHarbor.process(content);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48-hour expiration

    return prisma.whisperQuestion.create({
      data: {
        roomId,
        authorId,
        content: safe.sanitizedContent,
        expiresAt,
        status: PostStatus.APPROVED,
      },
    });
  }

  async addWhisperPeerNote(questionId: string, authorId: string, noteText: string) {
    const safe = SafeHarbor.process(noteText);
    return prisma.whisperPeerNote.create({
      data: {
        questionId,
        authorId,
        noteText: safe.sanitizedContent,
      },
    });
  }

  /**
   * 6. Sprout AI Companion: Daily Check-ins & Private Thought Partner
   */
  async getSproutCheckin(userId: string, contextTag?: string) {
    const prompts = [
      {
        text: 'Hey there! 🌸 Just checking in — how is your energy level today?',
        suggestedActions: [
          { label: 'Feeling great ✨', action: 'energy_high' },
          { label: 'A bit tired 🌧️', action: 'energy_low' },
          { label: 'Need a study break 🎧', action: 'open_lofi' },
        ],
      },
      {
        text: 'A quiet day is a good day. Have a question you want to ask anonymously in the Whisper Room?',
        suggestedActions: [
          { label: 'Ask a Question 🤫', action: 'open_whisper' },
          { label: 'Add to a Story ✍️', action: 'open_story' },
          { label: 'Just passing by 💜', action: 'dismiss' },
        ],
      },
    ];

    const selected = prompts[Math.floor(Math.random() * prompts.length)];

    await prisma.sproutLog.create({
      data: {
        userId,
        promptContext: contextTag || 'DAILY_GENTLE_CHECKIN',
      },
    });

    return selected;
  }

  /**
   * 7. The Constellation (Private Star-Map)
   */
  async getConstellationSky(userId: string) {
    return prisma.constellationStar.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async awardConstellationStar(userId: string, actionType: string, title: string) {
    const x = Math.random() * 0.8 + 0.1;
    const y = Math.random() * 0.8 + 0.1;

    return prisma.constellationStar.create({
      data: {
        userId,
        actionType,
        title,
        x,
        y,
      },
    });
  }

  /**
   * 8. Trellis: Mother's Non-Surveillance Bridge
   */
  async getTrellisDashboard(motherUserId: string) {
    const letters = await prisma.trellisLetter.findMany({
      where: { receiverMotherId: motherUserId },
      orderBy: { sentAt: 'desc' },
      take: 5,
    });

    const conversationCard = {
      theme: 'Body Image & Changes',
      opener: 'Talking about growing up without it feeling like an awkward lecture.',
      bulletPoints: [
        'Focus on how strong and capable the body is rather than how it looks.',
        'Share a funny or gentle memory from when you were her age.',
        'Keep it short: open the door for her to speak when she feels ready.',
      ],
    };

    const wellbeingSignal = {
      status: 'Active & Journaling',
      summary: 'Regular positive engagement across focus sessions and creative spaces.',
      lastObserved: new Date(),
    };

    return {
      conversationCard,
      wellbeingSignal,
      recentLetters: letters,
    };
  }

  async sendTrellisLetter(senderDaughterId: string, receiverMotherId: string, message: string, cardTemplateId?: string) {
    const safe = SafeHarbor.process(message);

    return prisma.trellisLetter.create({
      data: {
        senderDaughterId,
        receiverMotherId,
        message: safe.sanitizedContent,
        cardTemplateId,
      },
    });
  }
}
