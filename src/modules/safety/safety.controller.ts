import { Request, Response, NextFunction } from 'express';
import { SafetyService } from './safety.service.js';

const safetyService = new SafetyService();

export class SafetyController {
  static async getCrisisResources(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = (req.query.locale as string) || 'en-IN';
      const resources = await safetyService.getCrisisResources(locale);
      res.status(200).json(resources);
    } catch (error) {
      next(error);
    }
  }
}
