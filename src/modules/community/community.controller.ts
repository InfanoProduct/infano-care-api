import { Request, Response, NextFunction } from 'express';
import { CommunityService } from './community.service.js';
import { createPostSchema, createReplySchema, reactSchema, reportSchema } from './community.schema.js';
import { logger } from '../../config/logger.js';

const communityService = new CommunityService();

export class CommunityController {
  static async getCircles(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const contentTier = (req as any).contentTier || null;
      const circles = await communityService.getCircles(userId, contentTier);
      res.status(200).json({ success: true, circles });
    } catch (error) {
      next(error);
    }
  }

  static async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { circleId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 20;
      const userId = (req as any).userId;

      const result = await communityService.getPosts(circleId as string, page, perPage, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { body, params } = createPostSchema.parse({ body: req.body, params: req.params });
      const userId = (req as any).userId;
      const { circleId } = params;

      const post = await communityService.createPost(userId, circleId, body);
      res.status(201).json({ success: true, post });
    } catch (error) {
      next(error);
    }
  }

  static async getReplies(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      const userId = (req as any).userId;
      const replies = await communityService.getReplies(postId as string, userId);
      res.status(200).json({ success: true, replies });
    } catch (error) {
      next(error);
    }
  }

  static async createReply(req: Request, res: Response, next: NextFunction) {
    try {
      const { body, params } = createReplySchema.parse({ body: req.body, params: req.params });
      const userId = (req as any).userId;
      const { postId } = params;

      const reply = await communityService.createReply(userId, postId, body);
      res.status(201).json({ success: true, reply });
    } catch (error) {
      next(error);
    }
  }

  static async toggleReaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { body, params } = reactSchema.parse({ body: req.body, params: req.params });
      const userId = (req as any).userId;
      const { contentId } = params;
      const { contentType } = body;

      const result = await communityService.toggleReaction(userId, contentId as string, contentType, body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async togglePin(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      const { pin } = req.body; // boolean
      const post = await communityService.togglePin(postId as string, pin === true || pin === 'true');
      res.status(200).json({ success: true, post });
    } catch (error) {
      next(error);
    }
  }

  static async reportPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { body, params } = reportSchema.parse({ body: req.body, params: req.params });
      const userId = (req as any).userId;
      const { contentId } = params;
      const { contentType } = body;

      await communityService.reportContent(userId, contentId, contentType, body);
      res.status(200).json({ success: true, acknowledged: true });
    } catch (error) {
      next(error);
    }
  }

  static async submitAppeal(req: Request, res: Response, next: NextFunction) {
    try {
      const { body, params } = createPostSchema.parse({ body: req.body, params: req.params }); // Reusing for contentId
      const userId = (req as any).userId;
      const { contentId } = req.params;
      const { contentType, reason } = req.body;

      const appeal = await communityService.submitAppeal(userId, contentId as string, contentType as string, { reason: reason as string, contentType: contentType as any });
      res.status(201).json({ success: true, appeal });
    } catch (error) {
      next(error);
    }
  }

  static async toggleBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { contentId } = req.params;
      const { contentType } = req.body;
      const result = await communityService.toggleBookmark(userId, contentId as string, (contentType as string) || 'post');
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getBookmarks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const bookmarks = await communityService.getBookmarks(userId);
      res.status(200).json({ success: true, bookmarks });
    } catch (error) {
      next(error);
    }
  }

  static async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;
      const events = await communityService.getEvents(status);
      res.status(200).json({ success: true, events });
    } catch (error) {
      next(error);
    }
  }

  static async getWeeklyChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const challenge = await communityService.getWeeklyChallenge(userId);
      res.status(200).json({ success: true, challenge });
    } catch (error) {
      next(error);
    }
  }

  static async trackVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const { circleId } = req.params;
      const userId = (req as any).userId;
      await communityService.trackCircleVisit(userId, circleId as string);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
