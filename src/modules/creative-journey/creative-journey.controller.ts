import { Request, Response, NextFunction } from "express";
import { CreativeJourneyService } from "./creative-journey.service.js";

export class CreativeJourneyController {
  // ── Journey & Episode ─────────────────────────────────────────────────────

  static listJourneys = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const journeys = await CreativeJourneyService.listJourneys();
      res.json(journeys);
    } catch (e) {
      next(e);
    }
  };

  static getJourney = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const journey = await CreativeJourneyService.getJourney(String(req.params.id));
      res.json(journey);
    } catch (e) {
      next(e);
    }
  };

  static getEpisode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const episode = await CreativeJourneyService.getEpisode(String(req.params.episodeId));
      res.json(episode);
    } catch (e) {
      next(e);
    }
  };

  // ── Node Order ────────────────────────────────────────────────────────────

  static getNodeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const episodeId = String(req.params.episodeId);
      const nodeOrder = await CreativeJourneyService.getOrCreateNodeOrder(userId, episodeId);
      res.json({ nodeOrder });
    } catch (e) {
      next(e);
    }
  };

  // ── Node Progress ─────────────────────────────────────────────────────────

  static getEpisodeProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const episodeId = String(req.params.episodeId);
      const progress = await CreativeJourneyService.getEpisodeProgress(userId, episodeId);
      res.json(progress);
    } catch (e) {
      next(e);
    }
  };

  static updateNodeProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const episodeId = String(req.params.episodeId);
      const nodeId = String(req.params.nodeId);
      const { status, xpEarned, lastScreen } = req.body;
      const record = await CreativeJourneyService.updateNodeProgress(
        userId,
        episodeId,
        nodeId,
        status,
        xpEarned,
        lastScreen
      );
      res.json(record);
    } catch (e) {
      next(e);
    }
  };

  // ── Ask Gigi ──────────────────────────────────────────────────────────────

  static saveGigiEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const episodeId = String(req.params.episodeId);
      const nodeId = String(req.params.nodeId);
      const { entryText } = req.body;
      const entry = await CreativeJourneyService.saveGigiEntry(
        userId,
        episodeId,
        nodeId,
        entryText
      );
      res.json({ success: true, id: entry.id });
    } catch (e) {
      next(e);
    }
  };

  static getGigiEntriesForUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId = (req as any).user.id;
      const targetUserId = String(req.params.targetUserId);
      const entries = await CreativeJourneyService.getGigiEntriesForUser(
        requestingUserId,
        targetUserId
      );
      res.json(entries);
    } catch (e) {
      next(e);
    }
  };

  // ── My Progress ───────────────────────────────────────────────────────────

  static getMyProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const progress = await CreativeJourneyService.getMyProgress(userId);
      res.json(progress);
    } catch (e) {
      next(e);
    }
  };

  static resetEpisodeProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const episodeId = String(req.params.episodeId);
      const nodeOrder = await CreativeJourneyService.resetEpisodeProgress(userId, episodeId);
      res.json({ success: true, nodeOrder });
    } catch (e) {
      next(e);
    }
  };
}
