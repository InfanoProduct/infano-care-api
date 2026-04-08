import { Request, Response, NextFunction } from 'express';
import { ChatService } from './chat.service.js';
import { chatRequestSchema, historyRequestSchema } from './chat.schema.js';
import { logger } from '../../config/logger.js';

const chatService = new ChatService();

export class ChatController {
  /**
   * Send a message to Gigi
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, sessionId, moodCode } = chatRequestSchema.parse(req).body;
      const userId = (req as any).userId;

      logger.info({ userId, sessionId }, 'User sending message to Gigi');

      const result = await chatService.processMessage(userId, content, sessionId, moodCode);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages for a specific session (with pagination)
   */
  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = historyRequestSchema.parse(req).params;
      const userId = (req as any).userId;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const history = await chatService.getSessionHistory(userId, sessionId, cursor, limit);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all chat sessions for the user
   */
  static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      const sessions = await chatService.getUserSessions(userId);

      res.status(200).json({
        success: true,
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific chat session
   */
  static async deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const userId = (req as any).userId;

      await chatService.deleteSession(userId, sessionId);

      res.status(200).json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all chat sessions for the user
   */
  static async deleteAllSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      await chatService.deleteAllUserSessions(userId);

      res.status(200).json({
        success: true,
        message: 'All sessions deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
