import { Request, Response } from "express";
import { ExpertService } from "./expert.service.js";

export class ExpertController {
  static async getEnrollments(req: Request, res: Response) {
    try {
      const enrollments = await ExpertService.getEnrollments();
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getEnrollmentDetails(req: Request, res: Response) {
    try {
      const details = await ExpertService.getEnrollmentDetails(req.params.id as string);
      res.json(details);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const sessions = await ExpertService.getSessions(expertId);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async scheduleSession(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const session = await ExpertService.scheduleSession(expertId, req.body);
      res.status(201).json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async completeSession(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const session = await ExpertService.completeSession(expertId, req.params.id as string);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateSessionMeetLink(req: Request, res: Response) {
    try {
      const expertId = (req as any).userId;
      if (!expertId) return res.status(401).json({ error: "Unauthorized" });

      const { meetLink } = req.body;
      if (!meetLink || typeof meetLink !== 'string') {
        return res.status(400).json({ error: "meetLink is required" });
      }

      const session = await ExpertService.updateSessionMeetLink(expertId, req.params.id as string, meetLink);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
