import { Request, Response, NextFunction } from "express";
import { prisma } from "../../db/client.js";
import crypto from "crypto";

export class CreativeJourneyController {
  static async listJourneys(req: Request, res: Response, next: NextFunction) {
    try {
      const { ageBand } = req.query;
      const journeys = await prisma.creativeJourney.findMany({
        where: {
          isActive: true,
          ...(ageBand && typeof ageBand === "string" ? { ageBand } : {}),
        },
        include: {
          CreativeEpisode: {
            where: { isActive: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const formatted = journeys.map((j) => ({
        ...j,
        episodes: j.CreativeEpisode || [],
      }));

      res.status(200).json(formatted);
    } catch (error) {
      console.error("[CreativeJourneyController] listJourneys error:", error);
      next(error);
    }
  }

  static async getJourney(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params["id"] as string;
      const journey = await prisma.creativeJourney.findUnique({
        where: { id },
        include: {
          CreativeEpisode: {
            where: { isActive: true },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!journey) {
        res.status(404).json({ error: "Creative Journey not found" });
        return;
      }

      res.status(200).json({
        ...journey,
        episodes: journey.CreativeEpisode || [],
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeId = req.params["episodeId"] as string;
      const episode = await prisma.creativeEpisode.findUnique({
        where: { id: episodeId },
      });

      if (!episode) {
        res.status(404).json({ error: "Creative Episode not found" });
        return;
      }

      res.status(200).json(episode);
    } catch (error) {
      next(error);
    }
  }

  static async getOrCreateNodeOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeId = req.params["episodeId"] as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      const episode = await prisma.creativeEpisode.findUnique({
        where: { id: episodeId },
      });

      if (!episode) {
        res.status(404).json({ error: "Creative Episode not found" });
        return;
      }

      const nodes = Array.isArray(episode.nodes) ? (episode.nodes as any[]) : [];
      const nodeOrder = nodes.map((n) => n.nodeId || n.id || String(n));

      res.status(200).json({ nodeOrder });
    } catch (error) {
      next(error);
    }
  }

  static async getEpisodeProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeId = req.params["episodeId"] as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      if (!userId) {
        res.status(200).json([]);
        return;
      }

      const progress = await prisma.creativeNodeProgress.findMany({
        where: { userId, episodeId },
      });

      res.status(200).json(progress);
    } catch (error) {
      next(error);
    }
  }

  static async updateNodeProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeId = req.params["episodeId"] as string;
      const nodeId = req.params["nodeId"] as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;
      const { status, xpEarned, lastScreen } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const progress = await prisma.creativeNodeProgress.upsert({
        where: {
          userId_episodeId_nodeId: { userId, episodeId, nodeId },
        },
        create: {
          id: crypto.randomUUID(),
          userId,
          episodeId,
          nodeId,
          status: status || "LOCKED",
          xpEarned: Number(xpEarned) || 0,
          lastScreen: lastScreen || null,
          updatedAt: new Date(),
        },
        update: {
          status: status !== undefined ? status : undefined,
          xpEarned: xpEarned !== undefined ? Number(xpEarned) : undefined,
          lastScreen: lastScreen !== undefined ? lastScreen : undefined,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({ success: true, progress });
    } catch (error) {
      next(error);
    }
  }

  static async getMyProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = ((req as any).user?.id || (req as any).userId) as string;
      if (!userId) {
        res.status(200).json([]);
        return;
      }

      const progress = await prisma.creativeNodeProgress.findMany({
        where: { userId },
      });

      res.status(200).json(progress);
    } catch (error) {
      next(error);
    }
  }

  static async saveGigiEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeId = req.params["episodeId"] as string;
      const nodeId = req.params["nodeId"] as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;
      const { entryText } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const entry = await prisma.creativeAskGigiEntry.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          episodeId,
          nodeId,
          entryText: entryText || "",
        },
      });

      res.status(201).json({ success: true, entry });
    } catch (error) {
      next(error);
    }
  }
}
