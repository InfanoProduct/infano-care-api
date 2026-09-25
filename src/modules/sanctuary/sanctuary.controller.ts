import { Request, Response, NextFunction } from 'express';
import { SanctuaryService } from './sanctuary.service.js';
import {
  createMessageSchema,
  reactSchema,
  createStoryThreadSchema,
  appendStoryLineSchema,
  createWhisperQuestionSchema,
  createWhisperPeerNoteSchema,
  sendTrellisLetterSchema,
} from './sanctuary.schema.js';

const sanctuaryService = new SanctuaryService();

export class SanctuaryController {
  static async getCommunities(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'TEEN';

      // Ensure defaults are seeded on first query
      await sanctuaryService.seedDefaultsIfEmpty();

      const communities = await sanctuaryService.getCommunities(userId, userRole);
      res.status(200).json({ success: true, communities });
    } catch (error) {
      next(error);
    }
  }

  static async joinCommunity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'TEEN';
      const { communityId } = req.params;
      const { pseudonym } = req.body;

      const membership = await sanctuaryService.joinCommunity(userId, userRole, communityId as string, pseudonym);
      res.status(200).json({ success: true, membership });
    } catch (error) {
      next(error);
    }
  }

  static async getRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'TEEN';
      const { communityId } = req.params;

      const rooms = await sanctuaryService.getRooms(communityId as string, userId, userRole);
      res.status(200).json({ success: true, rooms });
    } catch (error) {
      next(error);
    }
  }

  static async getRoomMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { roomId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 30;

      const result = await sanctuaryService.getRoomMessages(roomId as string, userId, page, perPage);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async createMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { roomId } = req.params;
      const body = createMessageSchema.parse(req.body);

      const result = await sanctuaryService.createMessage(roomId as string, userId, body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async toggleReaction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { messageId } = req.params;
      const { reaction } = reactSchema.parse(req.body);

      const result = await sanctuaryService.toggleReaction(messageId as string, userId, reaction);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getStoryThreads(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const threads = await sanctuaryService.getStoryThreads(roomId as string);
      res.status(200).json({ success: true, threads });
    } catch (error) {
      next(error);
    }
  }

  static async createStoryThread(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const { title, prompt, maxLines } = createStoryThreadSchema.parse(req.body);
      const thread = await sanctuaryService.createStoryThread(roomId as string, title, prompt, maxLines);
      res.status(201).json({ success: true, thread });
    } catch (error) {
      next(error);
    }
  }

  static async appendStoryLine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { threadId } = req.params;
      const { lineText } = appendStoryLineSchema.parse(req.body);

      const result = await sanctuaryService.appendStoryLine(threadId as string, userId, lineText);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getWhisperQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const questions = await sanctuaryService.getWhisperQuestions(roomId as string);
      res.status(200).json({ success: true, questions });
    } catch (error) {
      next(error);
    }
  }

  static async createWhisperQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { roomId } = req.params;
      const { content } = createWhisperQuestionSchema.parse(req.body);

      const question = await sanctuaryService.createWhisperQuestion(roomId as string, userId, content);
      res.status(201).json({ success: true, question });
    } catch (error) {
      next(error);
    }
  }

  static async addWhisperPeerNote(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { questionId } = req.params;
      const { noteText } = createWhisperPeerNoteSchema.parse(req.body);

      const note = await sanctuaryService.addWhisperPeerNote(questionId as string, userId, noteText);
      res.status(201).json({ success: true, note });
    } catch (error) {
      next(error);
    }
  }

  static async getSproutCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const contextTag = req.query.contextTag as string | undefined;

      const checkin = await sanctuaryService.getSproutCheckin(userId, contextTag);
      res.status(200).json({ success: true, checkin });
    } catch (error) {
      next(error);
    }
  }

  static async getConstellationSky(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const stars = await sanctuaryService.getConstellationSky(userId);
      res.status(200).json({ success: true, stars });
    } catch (error) {
      next(error);
    }
  }

  static async getTrellisDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'TEEN';

      if (userRole.toUpperCase() !== 'PARENT') {
        return res.status(403).json({ success: false, message: 'Trellis dashboard is reserved for mothers/guardians.' });
      }

      const dashboard = await sanctuaryService.getTrellisDashboard(userId);
      res.status(200).json({ success: true, ...dashboard });
    } catch (error) {
      next(error);
    }
  }

  static async sendTrellisLetter(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { receiverMotherId, message, cardTemplateId } = sendTrellisLetterSchema.parse(req.body);

      const letter = await sanctuaryService.sendTrellisLetter(userId, receiverMotherId, message, cardTemplateId);
      res.status(201).json({ success: true, letter });
    } catch (error) {
      next(error);
    }
  }
}
