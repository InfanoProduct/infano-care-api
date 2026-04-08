import { Request, Response, NextFunction } from "express";
import { TrackerService } from "./tracker.service.js";
import { dailyLogSchema, trackerSetupSchema, updatePeriodRangeSchema } from "./tracker.schema.js";
import { InsightsService } from "./insights.service.js";

export class TrackerController {
  static async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const data   = trackerSetupSchema.parse(req);
      const result = await TrackerService.setup(userId, data.body);
      res.status(201).json(result);
    } catch (e) { next(e); }
  }

  static async logDaily(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const data   = dailyLogSchema.parse(req);
      const result = await TrackerService.logDaily(userId, data.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updatePeriodRange(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const data = updatePeriodRangeSchema.parse(req).body;
      const result = await TrackerService.updatePeriodRange(userId, data.startDate, data.endDate);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { from, to } = req.query;
      const result = await TrackerService.getLogs(userId, from as string, to as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPrediction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.getPrediction(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const symptoms = await InsightsService.getSymptomFrequency(userId);
      const moods = await InsightsService.getMoodByPhase(userId);
      res.status(200).json({ symptoms, moods });
    } catch (e) { next(e); }
  }

  static async getDoctorSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await InsightsService.getDoctorSummary(userId);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.getHistory(userId);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.getProfile(userId);
      if (!result) {
        return res.status(404).json({ message: "Tracker profile not found" });
      }
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async getNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.getNotificationPreferences(userId);
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  static async updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.updateNotificationPreferences(userId, req.body);
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  static async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await TrackerService.exportData(userId);
      res.status(202).json(result);
    } catch (error) { next(error); }
  }

  static async deleteAllData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      // Note: Typically you'd check a PIN/biometric header here
      await TrackerService.deleteAllData(userId);
      res.status(200).json({ message: "All tracker data permanently deleted" });
    } catch (error) { next(error); }
  }
}
