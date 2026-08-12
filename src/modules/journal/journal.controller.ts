import { Response } from "express";
import { JournalService } from "./journal.service.js";
import { logger } from "../../config/logger.js";

export class JournalController {
  // POST /api/journal/entries
  static async createEntry(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const entry = await JournalService.createEntry(userId, req.body);
      res.status(201).json({ success: true, data: entry });
    } catch (e: any) {
      logger.error({ err: e }, "JournalController.createEntry failed");
      res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/entries
  static async listEntries(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const { page, limit, mode, from, to } = req.query as Record<string, string>;
      const result = await JournalService.listEntries(userId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        mode,
        from,
        to,
      });
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/entries/:id
  static async getEntry(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const entry = await JournalService.getEntry(userId, req.params.id);
      res.json({ success: true, data: entry });
    } catch (e: any) {
      res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
    }
  }

  // PUT /api/journal/entries/:id
  static async updateEntry(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const entry = await JournalService.updateEntry(userId, req.params.id, req.body);
      res.json({ success: true, data: entry });
    } catch (e: any) {
      res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
    }
  }

  // DELETE /api/journal/entries/:id
  static async deleteEntry(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      await JournalService.deleteEntry(userId, req.params.id);
      res.json({ success: true, message: "Entry deleted" });
    } catch (e: any) {
      res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/prompts/daily
  static async getDailyPrompt(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const prompt = await JournalService.getDailyPrompt(userId);
      res.json({ success: true, data: prompt });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/prompts/jar?category=...
  static async getRandomPrompt(req: any, res: Response) {
    try {
      const { category } = req.query;
      const prompt = await JournalService.getRandomPrompt(category);
      res.json({ success: true, data: prompt });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/prompts
  static async getAllPrompts(_req: any, res: Response) {
    try {
      const prompts = await JournalService.getAllPrompts();
      res.json({ success: true, data: prompts });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/streak
  static async getStreak(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const streak = await JournalService.getStreak(userId);
      res.json({ success: true, data: streak });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/mood-weather?months=3
  static async getMoodWeather(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const months = req.query.months ? parseInt(req.query.months) : 3;
      const heatmap = await JournalService.getMoodWeather(userId, months);
      res.json({ success: true, data: heatmap });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/time-capsules
  static async getTimeCapsules(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const capsules = await JournalService.getTimeCapsules(userId);
      res.json({ success: true, data: capsules });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // GET /api/journal/on-this-day
  static async getOnThisDay(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const entries = await JournalService.getOnThisDay(userId);
      res.json({ success: true, data: entries });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // POST /api/journal/entries/:id/share
  static async shareToCommunity(req: any, res: Response) {
    try {
      const userId = req.user?.id || req.userId;
      const { id } = req.params;
      const { circleId, caption, isAnonymous } = req.body;
      const result = await JournalService.shareToCommunity(userId, id, { circleId, caption, isAnonymous });
      res.json({ success: true, data: result });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ success: false, message: e.message });
    }
  }

  // POST /api/journal/seed-prompts (internal/admin use)
  static async seedPrompts(_req: any, res: Response) {
    try {
      await JournalService.seedPrompts();
      res.json({ success: true, message: "Prompt bank seeded" });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}
