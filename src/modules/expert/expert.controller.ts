import { Request, Response } from 'express';
import { ExpertService } from './expert.service.js';
import { logger } from '../../config/logger.js';

const expertService = new ExpertService();

export class ExpertController {
  async listExperts(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const experts = await expertService.listExperts(userId);
      res.json(experts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list experts' });
    }
  }

  async getOrCreateSession(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { expertId } = req.body;

      if (!expertId) {
        return res.status(400).json({ error: 'expertId is required' });
      }

      const session = await expertService.getOrCreateSession(userId, expertId);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: 'Failed to establish expert session' });
    }
  }

  /**
   * Get sessions where current user is the expert
   */
  async getMySessions(req: any, res: any) {
    try {
      const expertId = req.userId;
      const sessions = await expertService.getExpertSessions(expertId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch expert sessions' });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }
      const messages = await expertService.getMessages(sessionId as string);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch expert messages' });
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }
      await expertService.markAsRead(sessionId as string, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }
}
