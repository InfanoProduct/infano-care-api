import { Request, Response, NextFunction } from 'express';
import { PeerLineService } from './peerline.service.js';
import { requestSessionSchema, sessionFeedbackSchema, mentorAvailabilitySchema, mentorOnboardSchema, mentorApplySchema } from './peerline.schema.js';
import { StorageService } from '../../common/utils/storage.js';

const peerLineService = new PeerLineService();
// Force reload v3 - ensuring new service methods are picked up.

export class PeerLineController {
  static async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const availability = await peerLineService.getAvailability();
      res.status(200).json({ success: true, availability });
    } catch (error) {
      next(error);
    }
  }

  static async getTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const topics = await peerLineService.getTopics();
      res.status(200).json({ success: true, topics });
    } catch (error) {
      next(error);
    }
  }

  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const status = await peerLineService.getMentorStatus(userId);
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }

  static async requestSession(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = requestSessionSchema.parse(req).body;
      const userId = (req as any).userId;
      const session = await peerLineService.requestSession(userId, validated);
      res.status(202).json(session);
    } catch (error) {
      next(error);
    }
  }

  static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { role, status } = req.query as { role?: string; status?: string };
      const sessions = await peerLineService.getSessions(userId, { role, status });
      res.status(200).json({ success: true, sessions });
    } catch (error) {
      next(error);
    }
  }

  static async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const sessionId = req.params.sessionId as string;
      const session = await peerLineService.getSession(userId, sessionId);
      const messages = await peerLineService.getMessages(userId, sessionId);
      res.status(200).json({ ...session, messages });
    } catch (error) {
      next(error);
    }
  }


  static async endSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const sessionId = req.params.sessionId as string;
      await peerLineService.endSession(userId, sessionId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async cancelSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const sessionId = req.params.sessionId as string;
      await peerLineService.cancelSession(userId, sessionId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async getQueuePosition(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const sessionId = req.params.sessionId as string;
      const result = await peerLineService.getQueuePosition(userId, sessionId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = sessionFeedbackSchema.parse(req);
      const userId = (req as any).userId;
      const { sessionId } = validated.params;
      await peerLineService.submitFeedback(userId, sessionId, validated.body);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async getMentorStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const stats = await peerLineService.getMentorStats(userId);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async updateMentorAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = mentorAvailabilitySchema.parse(req).body;
      const userId = (req as any).userId;
      const result = await peerLineService.updateMentorAvailability(userId, validated.isAvailable);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async claimNextSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const session = await peerLineService.claimNextSession(userId);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  static async acceptSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const sessionId = req.params.sessionId as string;
      const session = await peerLineService.acceptSession(userId, sessionId);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  static async onboardMentor(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = mentorOnboardSchema.parse(req).body;
      const userId = (req as any).userId;
      const result = await peerLineService.onboardMentor(userId, validated);
      res.status(200).json({ success: true, profile: result });
    } catch (error) {
      next(error);
    }
  }

  static async getMentorsByTopics(req: Request, res: Response, next: NextFunction) {

    try {
      const userId = (req as any).userId;
      const rawTopics = req.query.topics as string;
      const topicIds = rawTopics && rawTopics.trim().length > 0 ? rawTopics.split(',') : [];
      console.log(`[PeerLine] Searching mentors for topics: ${topicIds}`);
      const mentors = await peerLineService.getMentorsByTopics(userId, topicIds);
      console.log(`[PeerLine] Found ${mentors.length} mentors matching topics`);
      res.status(200).json({ success: true, mentors });
    } catch (error) {
      next(error);
    }
  }

  static async applyToMentor(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = mentorApplySchema.parse(req).body;
      const userId = (req as any).userId;
      const result = await peerLineService.applyToMentor(userId, validated);
      res.status(200).json({ success: true, profile: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateTrainingProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { episodeSlug, reflection, checks } = req.body;
      const result = await peerLineService.updateTrainingProgress(userId, episodeSlug, reflection, checks);
      res.status(200).json({ success: true, result });
    } catch (error) {
      next(error);
    }
  }

  static async submitAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { score, answers } = req.body;
      const result = await peerLineService.submitAssessment(userId, score, answers);
      res.status(200).json({ success: true, result });
    } catch (error) {
      next(error);
    }
  }

  static async agreeToConduct(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await peerLineService.agreeToConduct(userId);
      res.status(200).json({ success: true, result });
    } catch (error) {
      next(error);
    }
  }

  static async getTrainingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await peerLineService.getTrainingStatus(userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async uploadMedia(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new Error('No file provided');
      }
      const { url } = await StorageService.uploadFile(req.file.path, 'peerline');
      res.status(200).json({ success: true, url });
    } catch (error) {
      next(error);
    }
  }

  static async updateExpertise(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { expertise } = req.body;
      const result = await peerLineService.updateMentorExpertise(userId, expertise);
      res.status(200).json({ success: true, profile: result });
    } catch (error) {
      next(error);
    }
  }
}
