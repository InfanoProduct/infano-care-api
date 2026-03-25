import { Request, Response, NextFunction } from "express";
import { OnboardingService } from "./onboarding.service.js";
import { z } from "zod";

const personalizationSchema = z.object({
  goals:              z.array(z.string()).optional().default([]),
  periodComfortScore: z.number().int().min(1).max(5).optional(),
  periodStatus:       z.enum(["active", "waiting", "unsure"]),
  interestTopics:     z.array(z.string()).optional().default([]),
});

const avatarSchema = z.object({
  bodyTypeId:   z.number().int().min(1).optional().default(1),
  skinToneId:   z.number().int().min(1).optional().default(1),
  hairStyleId:  z.number().int().min(1).optional().default(1),
  hairColorId:  z.number().int().min(1).optional().default(1),
  eyeShapeId:   z.number().int().min(1).optional().default(1),
  eyeColorId:   z.number().int().min(1).optional().default(1),
  outfitId:     z.number().int().min(1).optional().default(1),
  accessories:  z.array(z.number().int()).optional().default([]),
});

const journeyNameSchema = z.object({
  journeyName: z.string().min(2).max(40),
});

const setupProfileSchema = z.object({
  displayName:    z.string().min(2).max(30).regex(/^[a-zA-Z0-9\s\-''\u00C0-\u024F\u0900-\u097F]+$/u, "Name contains invalid characters"),
  birthMonth:     z.number().int().min(1).max(12),
  birthYear:      z.number().int().min(1994).max(new Date().getFullYear() - 3),
  termsAccepted:  z.literal(true),
  privacyAccepted:z.literal(true),
  marketingOptIn: z.boolean().optional().default(false),
  locale:         z.string().optional().default("en"),
  timezone:       z.string().optional().default("UTC"),
});

export class OnboardingController {
  static async setupProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data   = setupProfileSchema.parse(req.body);
      const result = await OnboardingService.setupProfile((req as any).user?.id || (req as any).userId, data);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }
  static async savePersonalization(req: Request, res: Response, next: NextFunction) {
    try {
      const data   = personalizationSchema.parse(req.body);
      const result = await OnboardingService.savePersonalization((req as any).userId, data);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async saveAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const data   = avatarSchema.parse(req.body);
      const result = await OnboardingService.saveAvatar((req as any).userId, data);
      res.status(201).json(result);
    } catch (e) { next(e); }
  }

  static async saveJourneyName(req: Request, res: Response, next: NextFunction) {
    try {
      const { journeyName } = journeyNameSchema.parse(req.body);
      const result = await OnboardingService.saveJourneyName((req as any).userId, journeyName);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }

  static async completeOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OnboardingService.completeOnboarding((req as any).userId);
      res.status(200).json(result);
    } catch (e) { next(e); }
  }
}
