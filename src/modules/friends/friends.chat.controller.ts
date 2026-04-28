import { Request, Response } from 'express';
import { FriendsChatService } from './friends.chat.service.js';
import { logger } from '../../config/logger.js';

const chatService = new FriendsChatService();

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const matchId = String(req.params.match_id);
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 50;

    const result = await chatService.getMessages(userId, matchId, page, perPage);
    res.json(result);
  } catch (error: any) {
    logger.error({ error, matchId: req.params.match_id }, 'Error getting chat messages');
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const reportMatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const matchId = String(req.params.match_id);
    const result = await chatService.reportMatch(userId, matchId, req.body);
    res.json(result);
  } catch (error: any) {
    logger.error({ error, matchId: req.params.match_id }, 'Error reporting match');
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const blockMatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const matchId = String(req.params.match_id);
    const result = await chatService.blockMatch(userId, matchId);
    res.json(result);
  } catch (error: any) {
    logger.error({ error, matchId: req.params.match_id }, 'Error blocking match');
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
