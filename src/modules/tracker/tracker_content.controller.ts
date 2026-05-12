import { Request, Response, NextFunction } from "express";
import { prisma } from "../../db/client.js";
import { StorageService } from "../../common/utils/storage.js";

/**
 * TrackerContentController
 * Admin-only CRUD for TrackerInsight, TrackerStory, and TrackerArticle.
 *
 * Routes (all require admin auth):
 *   GET    /api/admin/tracker/insights           → list all insights
 *   POST   /api/admin/tracker/insights           → create insight
 *   PATCH  /api/admin/tracker/insights/:id       → update insight
 *   DELETE /api/admin/tracker/insights/:id       → delete insight
 *
 *   GET    /api/admin/tracker/insights/:insightId/stories          → list stories
 *   POST   /api/admin/tracker/insights/:insightId/stories          → create story (text)
 *   POST   /api/admin/tracker/insights/:insightId/stories/:id/image → upload story image
 *   PATCH  /api/admin/tracker/insights/:insightId/stories/:id      → update story text
 *   DELETE /api/admin/tracker/insights/:insightId/stories/:id      → delete story
 *
 *   GET    /api/admin/tracker/articles            → list all articles
 *   POST   /api/admin/tracker/articles            → create article
 *   PATCH  /api/admin/tracker/articles/:id        → update article
 *   DELETE /api/admin/tracker/articles/:id        → delete article
 */
export class TrackerContentController {

  // ─── Insights ────────────────────────────────────────────────────────────

  static async listInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { phase } = req.query;
      const where: any = {};
      if (phase) where.phase = phase;

      const insights = await (prisma as any).trackerInsight.findMany({
        where,
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
        include: {
          stories: { orderBy: { order: "asc" } },
        },
      });
      res.json(insights);
    } catch (e) { next(e); }
  }

  static async createInsight(req: Request, res: Response, next: NextFunction) {
    try {
      const { phase, cycleDay, previewTitle, previewEmoji, previewColorHex, sortOrder } = req.body;
      if (!phase || !previewTitle || !previewEmoji) {
        return res.status(400).json({ message: "phase, previewTitle, and previewEmoji are required" });
      }
      const insight = await (prisma as any).trackerInsight.create({
        data: { phase, cycleDay: cycleDay ?? null, previewTitle, previewEmoji, previewColorHex: previewColorHex ?? "#A855F7", sortOrder: sortOrder ?? 0 },
      });
      res.status(201).json(insight);
    } catch (e) { next(e); }
  }

  static async updateInsight(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { phase, cycleDay, previewTitle, previewEmoji, previewColorHex, sortOrder, isActive } = req.body;
      const insight = await (prisma as any).trackerInsight.update({
        where: { id },
        data: { phase, cycleDay, previewTitle, previewEmoji, previewColorHex, sortOrder, isActive },
      });
      res.json(insight);
    } catch (e) { next(e); }
  }

  static async deleteInsight(req: Request, res: Response, next: NextFunction) {
    try {
      await (prisma as any).trackerInsight.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) { next(e); }
  }

  // ─── Stories ────────────────────────────────────────────────────────────

  static async listStories(req: Request, res: Response, next: NextFunction) {
    try {
      const stories = await (prisma as any).trackerStory.findMany({
        where: { insightId: req.params.insightId },
        orderBy: { order: "asc" },
      });
      res.json(stories);
    } catch (e) { next(e); }
  }

  static async createStory(req: Request, res: Response, next: NextFunction) {
    try {
      const { insightId } = req.params;
      const { title, content, order } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: "title and content are required" });
      }
      const story = await (prisma as any).trackerStory.create({
        data: { insightId, title, content, order: order ?? 0 },
      });
      res.status(201).json(story);
    } catch (e) { next(e); }
  }

  /**
   * Upload or replace the background image for a story slide.
   * Expects multipart/form-data with field: file
   * Stores in: uploads/tracker/stories/
   */
  static async uploadStoryImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const { insightId, id } = req.params;

      // Verify story belongs to the given insight
      const story = await (prisma as any).trackerStory.findFirst({
        where: { id, insightId },
      });
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Upload to server storage under tracker/stories/
      const { url } = await StorageService.uploadFile(req.file.path, "tracker/stories");

      // Persist URL
      const updated = await (prisma as any).trackerStory.update({
        where: { id },
        data: { imageUrl: url },
      });

      res.json({ message: "Image uploaded successfully", imageUrl: url, story: updated });
    } catch (e) { next(e); }
  }

  static async updateStory(req: Request, res: Response, next: NextFunction) {
    try {
      const { insightId, id } = req.params;
      const { title, content, order } = req.body;
      const story = await (prisma as any).trackerStory.updateMany({
        where: { id, insightId },
        data: { title, content, order },
      });
      res.json(story);
    } catch (e) { next(e); }
  }

  static async deleteStory(req: Request, res: Response, next: NextFunction) {
    try {
      await (prisma as any).trackerStory.deleteMany({
        where: { id: req.params.id, insightId: req.params.insightId },
      });
      res.status(204).send();
    } catch (e) { next(e); }
  }

  // ─── Articles ────────────────────────────────────────────────────────────

  static async listArticles(req: Request, res: Response, next: NextFunction) {
    try {
      const { phase } = req.query;
      const where: any = {};
      if (phase) where.phase = phase;
      const articles = await (prisma as any).trackerArticle.findMany({
        where,
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
      });
      res.json(articles);
    } catch (e) { next(e); }
  }

  static async createArticle(req: Request, res: Response, next: NextFunction) {
    try {
      const { phase, cycleDay, title, readTime, emoji, url, body, sortOrder } = req.body;
      if (!phase || !title) {
        return res.status(400).json({ message: "phase and title are required" });
      }
      const article = await (prisma as any).trackerArticle.create({
        data: { phase, cycleDay: cycleDay ?? null, title, readTime: readTime ?? "3 min read", emoji: emoji ?? "📖", url: url ?? null, body: body ?? null, sortOrder: sortOrder ?? 0 },
      });
      res.status(201).json(article);
    } catch (e) { next(e); }
  }

  static async updateArticle(req: Request, res: Response, next: NextFunction) {
    try {
      const article = await (prisma as any).trackerArticle.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(article);
    } catch (e) { next(e); }
  }

  static async deleteArticle(req: Request, res: Response, next: NextFunction) {
    try {
      await (prisma as any).trackerArticle.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) { next(e); }
  }
}
