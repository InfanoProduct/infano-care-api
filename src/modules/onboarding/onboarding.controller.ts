import { Request, Response, NextFunction } from "express";
import { OnboardingService } from "./onboarding.service.js";
import { z } from "zod";

const personalizationSchema = z.object({
  goals:              z.array(z.string()).min(1),
  periodComfortScore: z.number().int().min(1).max(5),
  periodStatus:       z.enum(["active", "waiting", "unsure"]),
  interestTopics:     z.array(z.string()).min(1),
});

const avatarSchema = z.object({
  bodyTypeId:   z.number().int().min(1),
  skinToneId:   z.number().int().min(1),
  hairStyleId:  z.number().int().min(1),
  hairColorId:  z.number().int().min(1),
  eyeShapeId:   z.number().int().min(1),
  eyeColorId:   z.number().int().min(1),
  outfitId:     z.number().int().min(1),
  accessories:  z.array(z.number().int()).optional(),
});

const journeyNameSchema = z.object({
  journeyName: z.string().min(2).max(40),
});

export class OnboardingController {
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
