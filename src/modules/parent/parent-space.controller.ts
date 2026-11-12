import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ParentSpaceService } from "./parent-space.service.js";

const refundSchema = z.object({
  reason: z.string().min(1),
  feedback: z.string().optional(),
  dataOption: z.enum(["keep", "delete"]).optional().default("keep"),
});

const reportIssueSchema = z.object({
  issueType: z.string().min(1),
  notes: z.string().optional(),
});

const addressSchema = z.object({
  shippingAddress: z.string().min(3),
  city: z.string().min(2),
  pincode: z.string().min(4),
  phone: z.string().optional(),
});

const settingsSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  whatsappWeeklySummary: z.boolean().optional(),
  whatsappLessonNudge: z.boolean().optional(),
  notifyOrderUpdates: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
  improveCourseOptIn: z.boolean().optional(),
  pinAskMode: z.enum(["always", "every_24h"]).optional(),
  communityWaitlist: z.boolean().optional(),
});

const pinChangeSchema = z.object({
  currentPin: z.string(),
  newPin: z.string().regex(/^\d{4}$/),
});

export class ParentSpaceController {
  static async getOrdersSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const data = await ParentSpaceService.getOrdersSummary(userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async requestRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const orderId = req.params.orderId as string;
      const body = refundSchema.parse(req.body);
      const refund = await ParentSpaceService.requestRefund(userId, orderId, body);
      res.status(201).json(refund);
    } catch (e) {
      next(e);
    }
  }

  static async reportOrderIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const orderId = req.params.orderId as string;
      const body = reportIssueSchema.parse(req.body);
      const report = await ParentSpaceService.reportOrderIssue(userId, orderId, body);
      res.status(201).json(report);
    } catch (e) {
      next(e);
    }
  }

  static async updateOrderAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const orderId = req.params.orderId as string;
      const body = addressSchema.parse(req.body);
      const order = await ParentSpaceService.updateOrderAddress(userId, orderId, body);
      res.json(order);
    } catch (e) {
      next(e);
    }
  }

  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const data = await ParentSpaceService.getParentSettings(userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const body = settingsSchema.parse(req.body);
      const data = await ParentSpaceService.updateParentSettings(userId, body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async changePin(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const body = pinChangeSchema.parse(req.body);
      const data = await ParentSpaceService.changeParentPin(userId, body.currentPin, body.newPin);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async updateLearner(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const learnerId = req.params.learnerId as string;
      const data = await ParentSpaceService.updateLearnerProfile(userId, learnerId, req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async clearHealthAnswers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const learnerId = req.params.learnerId as string;
      const data = await ParentSpaceService.clearLearnerHealthAnswers(userId, learnerId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteLearner(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const learnerId = req.params.learnerId as string;
      const data = await ParentSpaceService.deleteLearnerProfile(userId, learnerId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async submitConcern(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const data = await ParentSpaceService.submitConcern(userId, req.body);
      res.status(201).json(data);
    } catch (e) {
      next(e);
    }
  }
}

