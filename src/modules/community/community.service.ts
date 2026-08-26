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
      include: { members: { select: { id: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const results: any[] = [];
    for (const circle of circles) {
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

      results.push({
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
        user_has_posted: userHasPosted,
        is_joined: userId ? circle.members.some(m => m.id === userId) : false,
        is_private: circle.isPrivate
      });
    }

    return results;
  }

  async joinCircles(userId: string, circleIds: string[]) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        joinedCircles: {
          connect: circleIds.map(id => ({ id }))
        }
      }
    });
    return { success: true };
  }

  async getMyFeed(userId: string, page: number = 1, perPage: number = 20) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { joinedCircles: { select: { id: true } } }
    });

    if (!user || user.joinedCircles.length === 0) {
      return { posts: [], pagination: { page, perPage, total: 0, totalPages: 0, hasMore: false } };
    }

    const circleIds = user.joinedCircles.map(c => c.id);
    const skip = (page - 1) * perPage;

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where: {
          circleId: { in: circleIds },
          OR: [
            { status: PostStatus.APPROVED },
            { authorId: userId, status: { in: [PostStatus.PENDING_AI, PostStatus.PENDING_HUMAN, PostStatus.REMOVED] } }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              profile: { select: { displayName: true, bloomLevel: true } },
            },
          },
          circle: {
            select: {
              id: true,
              name: true,
              iconEmoji: true,
              accentColor: true,
            }
          },
          challenge: true,
          journalEntry: true,
          bookmarks: { where: { userId } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.communityPost.count({
        where: {
          circleId: { in: circleIds },
          OR: [
            { status: PostStatus.APPROVED },
            { authorId: userId, status: { in: [PostStatus.PENDING_AI, PostStatus.PENDING_HUMAN, PostStatus.REMOVED] } }
          ]
        },
      }),
    ]);

    const postIds = posts.map(p => p.id);
    const userReactions = await prisma.postReaction.findMany({
      where: {
        userId,
        contentType: 'post',
        contentId: { in: postIds }
      }
    });

    const reactionMap = new Map(userReactions.map(r => [r.contentId, r.reaction]));

    const formatPost = (p: any) => {
      const journalData = p.journalData || (p.journalEntry ? {
        id: p.journalEntry.id,
        mode: p.journalEntry.mode,
        moodColor: p.journalEntry.moodColor,
        moodTag: p.journalEntry.moodTag,
        content: p.journalEntry.content,
        title: p.journalEntry.title,
        createdAt: p.journalEntry.createdAt,
      } : null);
      return {
        ...p,
        journalData,
        journalEntry: undefined,
        isBookmarked: (p.bookmarks as any[])?.length > 0,
        myReaction: reactionMap.get(p.id) || null,
        bookmarks: undefined,
      };
    };

    return {
      posts: posts.map(formatPost),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasMore: skip + posts.length < total,
      },
    };
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
          journalEntry: true,
          bookmarks: userId ? { where: { userId } } : undefined,
        },
        orderBy: { createdAt: 'desc' },
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
        journalEntry: true,
        bookmarks: userId ? { where: { userId } } : undefined,
      },
    });

    const allFetchedPosts = [...posts, ...pinned];
    const allPostIds = allFetchedPosts.map(p => p.id);
    const userReactions = userId ? await prisma.postReaction.findMany({
      where: {
        userId,
        contentType: 'post',
        contentId: { in: allPostIds }
      }
    }) : [];

    const reactionMap = new Map(userReactions.map(r => [r.contentId, r.reaction]));

    const formatPost = (p: any) => {
      const journalData = p.journalData || (p.journalEntry ? {
        id: p.journalEntry.id,
        mode: p.journalEntry.mode,
        moodColor: p.journalEntry.moodColor,
        moodTag: p.journalEntry.moodTag,
        content: p.journalEntry.content,
        title: p.journalEntry.title,
        createdAt: p.journalEntry.createdAt,
      } : null);
      return {
        ...p,
        journalData,
        journalEntry: undefined,
        isBookmarked: (p.bookmarks as any[])?.length > 0,
        myReaction: reactionMap.get(p.id) || null,
        bookmarks: undefined,
      };
    };

    const mappedPosts = posts.map(formatPost);
    const mappedPinned = pinned.map(formatPost);

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
    const textModeration = await this.placeholderModeration(input.content);
    let finalModeration = textModeration;

    // Image Moderation Check
    if (input.imageUrl) {
      const imageModeration = await this.placeholderImageModeration(input.imageUrl);
      if (imageModeration.decision !== ModerationDecision.APPROVE) {
        finalModeration = imageModeration; // Override with image failure
      }
    }

    const status = finalModeration.decision === ModerationDecision.APPROVE
      ? PostStatus.APPROVED
      : PostStatus.PENDING_HUMAN;

    const post = await prisma.communityPost.create({
      data: {
        circleId,
        authorId: userId,
        content: input.content,
        imageUrl: input.imageUrl,
        isChallengeResponse: input.isChallengeResponse ?? false,
        challengeId: input.challengeId,
        status,
        aiDecision: finalModeration.decision,
        crisisSeverity: finalModeration.crisisSeverity,
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
        bookmarks: userId ? { where: { userId } } : undefined,
        childReplies: {
          where: { status: PostStatus.APPROVED },
          include: {
            author: {
              select: {
                id: true,
                profile: { select: { displayName: true } },
              },
            },
            bookmarks: userId ? { where: { userId } } : undefined,
            childReplies: {
              where: { status: PostStatus.APPROVED },
              include: {
                author: {
                  select: {
                    id: true,
                    profile: { select: { displayName: true } },
                  },
                },
                bookmarks: userId ? { where: { userId } } : undefined,
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

    // Update post reply count & dispatch notification
    if (status === PostStatus.APPROVED) {
      await prisma.communityPost.update({
        where: { id: postId },
        data: { replyCount: { increment: 1 } },
      });

      this.dispatchReplyNotification(userId, postId, reply.id, input.content, input.parentReplyId).catch(err => {
        logger.error({ err, postId, replyId: reply.id }, "Failed to dispatch reply notification");
      });
    }

    return reply;
  }

  private async dispatchReplyNotification(
    replierUserId: string,
    postId: string,
    replyId: string,
    content: string,
    parentReplyId?: string | null
  ) {
    try {
      const replier = await prisma.user.findUnique({
        where: { id: replierUserId },
        include: { profile: true }
      });
      const replierName = replier?.profile?.displayName || replier?.username || "A community member";
      const preview = content.length > 80 ? content.slice(0, 77) + "..." : content;
      const { FirebaseService } = await import("../../common/services/firebase.service.js");

      if (parentReplyId) {
        // Nested reply -> notify parent comment author
        const parentReply = await prisma.communityReply.findUnique({
          where: { id: parentReplyId },
          include: { author: true }
        });

        if (parentReply && parentReply.authorId && parentReply.authorId !== replierUserId) {
          const title = `${replierName} replied to your comment 💬`;
          const body = `"${preview}"`;
          const deepLink = `infano://community/post/${postId}`;

          await prisma.notificationHistory.create({
            data: {
              userId: parentReply.authorId,
              type: "COMMUNITY_REPLY_REPLIED",
              title,
              body,
              deepLink,
              payload: { postId, replyId, parentReplyId },
              sentAt: new Date()
            }
          });

          if (parentReply.author?.fcmToken) {
            await FirebaseService.sendPushNotification(parentReply.author.fcmToken, {
              title,
              body,
              deepLink,
              data: { notificationType: "COMMUNITY_REPLY_REPLIED", postId, replyId }
            });
          }
        }
      } else {
        // Direct reply to post -> notify post author
        const post = await prisma.communityPost.findUnique({
          where: { id: postId },
          include: { author: true, circle: true }
        });

        if (post && post.authorId && post.authorId !== replierUserId) {
          const circleName = post.circle?.name ? ` in #${post.circle.name}` : "";
          const title = `${replierName} replied to your post 💬`;
          const body = `"${preview}"${circleName}`;
          const deepLink = `infano://community/post/${postId}`;

          await prisma.notificationHistory.create({
            data: {
              userId: post.authorId,
              type: "COMMUNITY_POST_REPLIED",
              title,
              body,
              deepLink,
              payload: { postId, replyId, circleId: post.circleId },
              sentAt: new Date()
            }
          });

          if (post.author?.fcmToken) {
            await FirebaseService.sendPushNotification(post.author.fcmToken, {
              title,
              body,
              deepLink,
              data: { notificationType: "COMMUNITY_POST_REPLIED", postId, replyId }
            });
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "Error in dispatchReplyNotification");
    }
  }

  // Reactions
  async toggleReaction(userId: string, contentId: string, contentType: 'post' | 'reply', input: ReactInput) {
    const { reaction } = input;
    const field = `reaction${reaction.charAt(0).toUpperCase() + reaction.slice(1)}`;

    const existing = await prisma.postReaction.findFirst({
      where: { contentId, contentType, userId },
    });

    if (existing) {
      const oldField = `reaction${existing.reaction.charAt(0).toUpperCase() + existing.reaction.slice(1)}`;

      // Remove old reaction
      await prisma.postReaction.delete({ where: { id: existing.id } });

      // Decrement old count
      if (contentType === 'post') {
        await prisma.communityPost.update({
          where: { id: contentId },
          data: { [oldField]: { decrement: 1 } },
        });
      } else {
        await prisma.communityReply.update({
          where: { id: contentId },
          data: { [oldField]: { decrement: 1 } },
        });
      }

      // If it was the same reaction, we're done (toggled off)
      if (existing.reaction === reaction) {
        return { success: true, removed: true };
      }
    }

    // Add new reaction
    await prisma.postReaction.create({
      data: { userId, contentId, contentType, reaction },
    });

    if (contentType === 'post') {
      const updatedPost = await prisma.communityPost.update({
        where: { id: contentId },
        data: { [field]: { increment: 1 } },
        include: { author: true }
      });

      // Notify post author of reaction if not self-reaction
      if (updatedPost.authorId && updatedPost.authorId !== userId) {
        try {
          const reactor = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
          });
          const reactorName = reactor?.profile?.displayName || reactor?.username || "A member";
          const title = `${reactorName} supported your post 💜`;
          const body = `Someone gave your post a ${reaction} reaction!`;
          const deepLink = `infano://community/post/${contentId}`;

          await prisma.notificationHistory.create({
            data: {
              userId: updatedPost.authorId,
              type: "COMMUNITY_REACTION_MILESTONE",
              title,
              body,
              deepLink,
              payload: { postId: contentId, reaction },
              sentAt: new Date()
            }
          });

          if (updatedPost.author.fcmToken) {
            const { FirebaseService } = await import("../../common/services/firebase.service.js");
            await FirebaseService.sendPushNotification(updatedPost.author.fcmToken, {
              title,
              body,
              deepLink,
              data: { notificationType: "COMMUNITY_REACTION_MILESTONE", postId: contentId }
            });
          }
        } catch (reactErr) {
          logger.error({ reactErr }, "Error sending reaction notification");
        }
      }
    } else {
      await prisma.communityReply.update({
        where: { id: contentId },
        data: { [field]: { increment: 1 } },
      });
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

  // Delete a post — author can soft-delete (AUTHOR_DELETED), admin can hard-delete
  async deletePost(postId: string, requesterId: string, requesterRole: string) {
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw Object.assign(new Error('Post not found'), { statusCode: 404 });

    const isAdmin = requesterRole === 'ADMIN';
    const isAuthor = post.authorId === requesterId;

    if (!isAdmin && !isAuthor) {
      throw Object.assign(new Error('Forbidden: you cannot delete this post'), { statusCode: 403 });
    }

    if (isAdmin) {
      // Hard delete — cascade handles reactions, bookmarks, replies (if onDelete: Cascade is set)
      await prisma.communityPost.delete({ where: { id: postId } });
      return { deleted: true, hard: true };
    }

    // Soft delete for author
    await prisma.communityPost.update({
      where: { id: postId },
      data: { status: PostStatus.AUTHOR_DELETED, deletedAt: new Date() },
    });
    return { deleted: true, hard: false };
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

  // Simulated image moderation placeholder
  private async placeholderImageModeration(imageUrl: string) {
    // In a real application, you would pass the imageUrl to an API like Google Cloud Vision
    // or AWS Rekognition to check for NSFW, violent, or inappropriate content.
    // For now, we simulate an approval.

    return {
      decision: ModerationDecision.APPROVE,
      crisisSeverity: CrisisSeverity.NONE,
    };
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
