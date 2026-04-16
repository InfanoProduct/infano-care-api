import { Request, Response, NextFunction } from 'express';
import { EventsService } from './events.service.js';
import { submitQuestionSchema, eventReminderSchema } from './events.schema.js';

const eventsService = new EventsService();

export class EventsController {
  static async submitQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = submitQuestionSchema.parse(req);
      const userId = (req as any).userId;
      const question = await eventsService.submitQuestion(userId, validated.params.id, validated.body.content, validated.body.isAnonymous ?? false);
      res.status(201).json({ success: true, question });
    } catch (error) {
      next(error);
    }
  }

  static async getQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const questions = await eventsService.getEventQuestions(id as string);
      res.status(200).json({ success: true, questions });
    } catch (error) {
      next(error);
    }
  }

  static async setReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = eventReminderSchema.parse(req);
      const userId = (req as any).userId;
      const result = await eventsService.setReminder(userId, validated.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
