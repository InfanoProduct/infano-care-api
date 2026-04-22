import { prisma } from '../../db/client.js';
import { CreatePostInput, CreateReplyInput, ReactInput, ReportInput, AppealInput } from './community.schema.js';
import { PostStatus, ModerationDecision, CrisisSeverity } from '@prisma/client';
import { logger } from '../../config/logger.js';

export class CommunityService {
  // Circles
  async getCircles(userId: string | null, contentTier: string | null = null) {
    const tiers = ['JUNIOR', 'TEEN_EARLY', 'TEEN_LATE', 'ADULT'];
    const getAllowedMinTiers = (t: string) => tiers.slice(0, tiers.indexOf(t) + 1);
    const getAllowedMaxTiers = (t: string) => tiers.slice(tiers.indexOf(t));

    const circles = await prisma.communityCircle.findMany({
      where: {
        isActive: true,
        ...(contentTier ? {
          OR: [
             { minContentTier: null },
             { minContentTier: { in: getAllowedMinTiers(contentTier) as any[] } }
          ],
          AND: [
            { OR: [{ maxContentTier: null }, { maxContentTier: { in: getAllowedMaxTiers(contentTier) as any[] } }] }
          ]
        } : {})
      },
      orderBy: { sortOrder: 'asc' },
    });

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return Promise.all(circles.map(async (circle) => {
      let unreadCount = 0;
      try {
        if (userId) {
          const lastActivity = await prisma.communityActivityLog.findUnique({
            where: { userId_circleId: { userId, circleId: circle.id } }
          });
          unreadCount = await prisma.communityPost.count({
            where: {
              circleId: circle.id,
              status: PostStatus.APPROVED,
              publishedAt: { gt: lastActivity?.lastVisitedAt ?? new Date(0) }
            }
          });
        }
      } catch (e) {
        logger.error(`Error calculating unread count for circle ${circle.id}: ${e}`);
      }

      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [recentPostCount, memberAggregation, userHasPosted] = await Promise.all([
        prisma.communityPost.count({
          where: {
            circleId: circle.id,
            status: PostStatus.APPROVED,
            publishedAt: { gte: fortyEightHoursAgo }
          }
        }),
        prisma.communityPost.groupBy({
          by: ['authorId'],
          where: {
            circleId: circle.id,
            status: PostStatus.APPROVED,
            publishedAt: { gte: thirtyDaysAgo }
          }
        }),
        userId ? prisma.communityPost.findFirst({
          where: {
            circleId: circle.id,
            authorId: userId,
            status: PostStatus.APPROVED
          }
        }).then(p => !!p) : Promise.resolve(false)
      ]);

      return {
        id: circle.id,
        slug: circle.slug,
        name: circle.name,
        description: circle.description,
        iconEmoji: circle.iconEmoji,
        accentColor: circle.accentColor,
        isAgeSpecific: circle.isAgeSpecific,
        unread_count: unreadCount,
        recent_post_count: recentPostCount,
        member_count: memberAggregation.length,
        user_has_posted: userHasPosted
      };
    }));
  }

  // Posts
  async getPosts(circleId: string, page: number = 1, perPage: number = 20, userId: string | null = null) {
    const skip = (page - 1) * perPage;
    
    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where: {
          circleId,
          OR: [
            { status: PostStatus.APPROVED },
            { authorId: userId || 'none', status: { in: [PostStatus.PENDING_AI, PostStatus.PENDING_HUMAN, PostStatus.REMOVED] } }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              profile: {
                select: {
                  displayName: true,
                  bloomLevel: true,
                },
              },
            },
          },
          challenge: true,
          bookmarks: userId ? { where: { userId } } : false,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.communityPost.count({
        where: {
          circleId,
          OR: [
            { status: PostStatus.APPROVED },
            { authorId: userId || 'none', status: { in: [PostStatus.PENDING_AI, PostStatus.PENDING_HUMAN, PostStatus.REMOVED] } }
          ]
        },
      }),
    ]);

    const pinned = await prisma.communityPost.findMany({
      where: {
        circleId,
        isPinned: true,
        status: PostStatus.APPROVED,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
        challenge: true,
        bookmarks: userId ? { where: { userId } } : false,
      },
    });

    // Map to include isBookmarked boolean
    const mappedPosts = posts.map(p => ({
      ...p,
      isBookmarked: (p.bookmarks as any[])?.length > 0,
      bookmarks: undefined
    }));

    const mappedPinned = pinned.map(p => ({
      ...p,
      isBookmarked: (p.bookmarks as any[])?.length > 0,
      bookmarks: undefined
    }));

    return {
      posts: mappedPosts,
      pinned: mappedPinned,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasMore: skip + posts.length < total,
      },
    };
  }

  async createPost(userId: string, circleId: string, input: CreatePostInput) {
    console.log(`[CommunityService] createPost input:`, JSON.stringify(input, null, 2));
    // 1. Placeholder for AI Moderation
    const moderation = await this.placeholderModeration(input.content);
    
    const status = moderation.decision === ModerationDecision.APPROVE 
      ? PostStatus.APPROVED 
      : PostStatus.PENDING_HUMAN;

    const post = await prisma.communityPost.create({
      data: {
        circleId,
        authorId: userId,
        content: input.content,
        isChallengeResponse: input.isChallengeResponse ?? false,
        challengeId: input.challengeId,
        status,
        aiDecision: moderation.decision,
        crisisSeverity: moderation.crisisSeverity,
        publishedAt: status === PostStatus.APPROVED ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            profile: { select: { displayName: true, bloomLevel: true } }
          }
        },
        challenge: true
      }
    });

    return post;
  }

  // Replies
  async getReplies(postId: string, userId: string | null = null) {
    // We want a tree of root replies (parentReplyId is null)
    // with their children up to 2 more levels (total 3).
    return prisma.communityReply.findMany({
      where: {
        postId,
        parentReplyId: null,
        status: PostStatus.APPROVED,
      },
      include: {
        author: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
        bookmarks: userId ? { where: { userId } } : false,
        childReplies: {
          where: { status: PostStatus.APPROVED },
          include: {
            author: {
              select: {
                id: true,
                profile: { select: { displayName: true } },
              },
            },
            bookmarks: userId ? { where: { userId } } : false,
            childReplies: {
              where: { status: PostStatus.APPROVED },
              include: {
                author: {
                  select: {
                    id: true,
                    profile: { select: { displayName: true } },
                  },
                },
                bookmarks: userId ? { where: { userId } } : false,
              },
            },
          },
        },
      },
      orderBy: { publishedAt: 'asc' },
    });
  }

  async createReply(userId: string, postId: string, input: CreateReplyInput) {
    const moderation = await this.placeholderModeration(input.content);
    
    const status = moderation.decision === ModerationDecision.APPROVE 
      ? PostStatus.APPROVED 
      : PostStatus.PENDING_HUMAN;

    // Check depth
    let depth = 1;
    if (input.parentReplyId) {
      const parent = await prisma.communityReply.findUnique({
        where: { id: input.parentReplyId },
      });
      if (parent) {
        depth = Math.min(parent.depth + 1, 3);
      }
    }

    const reply = await prisma.communityReply.create({
      data: {
        postId,
        authorId: userId,
        parentReplyId: input.parentReplyId,
        content: input.content,
        status,
        depth,
        aiDecision: moderation.decision,
        publishedAt: status === PostStatus.APPROVED ? new Date() : null,
      },
    });

    // Update post reply count
    if (status === PostStatus.APPROVED) {
      await prisma.communityPost.update({
        where: { id: postId },
        data: { replyCount: { increment: 1 } },
      });
    }

    return reply;
  }

  // Reactions
  async toggleReaction(userId: string, contentId: string, contentType: 'post' | 'reply', input: ReactInput) {
    const { reaction } = input;
    const field = `reaction${reaction.charAt(0).toUpperCase() + reaction.slice(1)}`;

    const existing = await prisma.postReaction.findUnique({
      where: {
        contentId_contentType_userId_reaction: {
          contentId,
          contentType,
          userId,
          reaction,
        },
      },
    });

    if (existing) {
      // Remove reaction
      await prisma.postReaction.delete({ where: { id: existing.id } });
      
      if (contentType === 'post') {
        await prisma.communityPost.update({
          where: { id: contentId },
          data: { [field]: { decrement: 1 } },
        });
      } else {
        await prisma.communityReply.update({
          where: { id: contentId },
          data: { [field]: { decrement: 1 } },
        });
      }
    } else {
      // Add reaction
      await prisma.postReaction.create({
        data: { userId, contentId, contentType, reaction },
      });

      if (contentType === 'post') {
        await prisma.communityPost.update({
          where: { id: contentId },
          data: { [field]: { increment: 1 } },
        });
      } else {
        await prisma.communityReply.update({
          where: { id: contentId },
          data: { [field]: { increment: 1 } },
        });
      }
    }

    return { success: true };
  }

  async getBookmarks(userId: string) {
    const bookmarks = await prisma.communityBookmark.findMany({
      where: { userId, postId: { not: null } },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                profile: { select: { displayName: true } },
                role: true,
              },
            },
            circle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks.map(b => ({
      ...b.post,
      isBookmarked: true, // By definition
    }));
  }

  // Pin / Unpin a post
  async togglePin(postId: string, pin: boolean) {
    return prisma.communityPost.update({
      where: { id: postId },
      data: { isPinned: pin },
    });
  }

  // Bookmarks
  async toggleBookmark(userId: string, contentId: string, contentType: string) {
    const whereClause = contentType === 'post' 
      ? { userId_postId: { userId, postId: contentId } }
      : { userId_replyId: { userId, replyId: contentId } };

    const existing = await (prisma.communityBookmark as any).findUnique({
      where: whereClause
    });

    if (existing) {
      await (prisma.communityBookmark as any).delete({
        where: { id: existing.id }
      });
      return { bookmarked: false };
    } else {
      const createData = contentType === 'post' 
        ? { userId, postId: contentId }
        : { userId, replyId: contentId };
      await (prisma.communityBookmark as any).create({
        data: createData
      });
      return { bookmarked: true };
    }
  }

  // Reporting
  async reportContent(userId: string, contentId: string, contentType: string, input: ReportInput) {
    return prisma.moderationLog.create({
      data: {
        contentId,
        contentType,
        layer: 'human', // Triggered by user report
        decision: ModerationDecision.HOLD,
        reasonCode: input.category,
      },
    });
  }

  async submitAppeal(userId: string, contentId: string, contentType: string, input: AppealInput) {
    // Verify ownership
    if (contentType === 'post') {
      const post = await prisma.communityPost.findUnique({ where: { id: contentId } });
      if (!post || post.authorId !== userId) throw new Error('Unauthorized');
    } else {
      const reply = await prisma.communityReply.findUnique({ where: { id: contentId } });
      if (!reply || reply.authorId !== userId) throw new Error('Unauthorized');
    }

    return (prisma.moderationAppeal as any).create({
      data: {
        contentId,
        contentType,
        authorId: userId,
        reason: input.reason,
      },
    });
  }

  // Simple placeholder moderation logic
  private async placeholderModeration(text: string) {
    const lowerText = text.toLowerCase();
    
    // Safety check for crisis language
    const crisisKeywords = ['hurt myself', 'suicide', 'kill myself', 'end it all', 'die'];
    if (crisisKeywords.some(word => lowerText.includes(word))) {
      return {
        decision: ModerationDecision.HOLD,
        crisisSeverity: CrisisSeverity.HIGH,
      };
    }

    // Basic curse word filter
    const bannedWords = ['spam', 'badword1', 'badword2']; // Example
    if (bannedWords.some(word => lowerText.includes(word))) {
      return {
        decision: ModerationDecision.HOLD,
        crisisSeverity: CrisisSeverity.NONE,
      };
    }

    return {
      decision: ModerationDecision.APPROVE,
      crisisSeverity: CrisisSeverity.NONE,
    };
  }

  // Events
  async getEvents(status?: string) {
    const now = new Date();
    let where: any = {};

    if (status === 'live') {
      where = {
        startDate: { lte: now },
        endDate: { gte: now },
      };
    } else if (status === 'upcoming') {
      where = {
        startDate: { gt: now },
      };
    } else if (status === 'past') {
      where = {
        endDate: { lt: now }, // Using endDate for past check
      };
    } else {
      // Default: only upcoming and live
      where = {
        startDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // Include recent live
      };
    }

    const events = await prisma.communityEvent.findMany({
      where,
      orderBy: { startDate: status === 'past' ? 'desc' : 'asc' },
    });

    // Enrich with mock expert data and counts if not in DB
    return events.map(event => ({
      ...event,
      expert_name: (event as any).expertName || 'Dr. Expert',
      expert_credentials: (event as any).expertCredentials || 'Community Specialist',
      question_count: (event as any).questionCount || Math.floor(Math.random() * 30),
      view_count: (event as any).viewCount || Math.floor(Math.random() * 500) + 100,
    }));
  }

  // Weekly Challenge
  async getWeeklyChallenge(userId?: string) {
    const now = new Date();
    const challenge = await prisma.weeklyChallenge.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) return null;

    const [participatingCount, userHasResponded, featuredResponses] = await Promise.all([
      // Count total approved challenge responses
      prisma.communityPost.count({
        where: { challengeId: challenge.id, status: PostStatus.APPROVED },
      }),
      // Check if current user has responded
      userId ? prisma.communityPost.findFirst({
        where: { challengeId: challenge.id, authorId: userId },
      }).then(p => !!p) : Promise.resolve(false),
      // Get max 10 featured responses
      prisma.communityPost.findMany({
        where: { challengeId: challenge.id, isFeatured: true, status: PostStatus.APPROVED },
        take: 10,
        include: {
          author: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              role: true,
            },
          },
          circle: true,
        },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    return {
      id: challenge.id,
      theme: challenge.theme,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      promptsByCircle: challenge.promptsByCircle,
      participatingCount,
      userHasResponded,
      featuredResponses,
    };
  }

  // Activity Tracking
  async trackCircleVisit(userId: string, circleId: string) {
    return prisma.communityActivityLog.upsert({
      where: {
        userId_circleId: { userId, circleId }
      },
      update: {
        lastVisitedAt: new Date()
      },
      create: {
        userId,
        circleId,
        lastVisitedAt: new Date()
      }
    });
  }
}
