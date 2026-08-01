import { Request, Response, NextFunction } from 'express';
import { PeerLineService } from './peerline.service.js';
import { connectRequestSchema, requestSessionSchema, sessionFeedbackSchema, mentorAvailabilitySchema, mentorOnboardSchema, mentorApplySchema } from './peerline.schema.js';
import { StorageService } from '../../common/utils/storage.js';

const peerLineService = new PeerLineService();

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

  // ─── New Connection Endpoints ────────────────────────────────────────────────

  /**
   * POST /peerline/connections/request
   * Teen sends a connection request to a specific peer mentor.
   */
  static async requestConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = connectRequestSchema.parse(req).body;
      const userId = (req as any).userId;
      const connection = await peerLineService.requestConnection(userId, validated);
      res.status(202).json(connection);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /peerline/connections/:connectionId/accept
   * Peer mentor accepts a teen's connection request.
   */
  static async acceptConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const connectionId = req.params.connectionId as string;
      const connection = await peerLineService.acceptConnection(userId, connectionId);
      res.status(200).json(connection);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /peerline/connections/:connectionId/decline
   * Peer mentor declines a teen's connection request.
   */
  static async declineConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const connectionId = req.params.connectionId as string;
      const connection = await peerLineService.declineConnection(userId, connectionId);
      res.status(200).json({ success: true, connection });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /peerline/connections/:connectionId/cancel
   * Teen cancels their own pending connection request.
   */
  static async cancelConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const connectionId = req.params.connectionId as string;
      const connection = await peerLineService.cancelConnection(userId, connectionId);
      res.status(200).json({ success: true, connection });
    } catch (error) {
      next(error);
    }
  }

  // ─── Legacy Session Endpoints (kept for backward compat) ─────────────────────

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

  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const sessionId = req.params.sessionId as string;
      const messages = await peerLineService.getMessages(userId, sessionId);
      res.status(200).json({ success: true, messages });
    } catch (error) {
      next(error);
    }
  }

  // ─── Mentor Endpoints ─────────────────────────────────────────────────────────

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

  // ─── Training Endpoints ───────────────────────────────────────────────────────

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

  static async getTrainingCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await peerLineService.getTrainingCourse();
      if (!course) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      res.status(200).json(course);
    } catch (error) {
      next(error);
    }
  }

  static async getTrainingEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeSlug = req.params.episodeSlug as string;
      const episode = await peerLineService.getTrainingEpisode(episodeSlug);
      if (!episode) {
        return res.status(404).json({ success: false, error: 'Episode not found' });
      }
      res.status(200).json(episode);
    } catch (error) {
      next(error);
    }
  }
}