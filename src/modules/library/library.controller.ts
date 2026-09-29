import { Request, Response, NextFunction } from "express";
import { LibraryService } from "./library.service.js";
import { EtsyService } from "./etsy.service.js";

export class LibraryController {
  /**
   * GET /api/library/my-books
   * Fetch all books unlocked by the logged-in user
   */
  static async getMyBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String((req as any).userId || (req as any).user?.id || "");
      const books = await LibraryService.getMyLibrary(userId);
      return res.status(200).json({
        success: true,
        data: books
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/library/claim-etsy
   * Redeem an Etsy Order Receipt to unlock Gigi the Book
   */
  static async claimEtsyOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String((req as any).userId || (req as any).user?.id || "");
      const { receiptId } = req.body;
      const result = await LibraryService.claimEtsyOrder(userId, String(receiptId || ""));
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/library/verify-order/:receiptId (Public endpoint for pre-validation on /redeem page)
   */
  static async verifyEtsyOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const receiptId = String(req.params.receiptId || "");
      const result = await EtsyService.verifyReceipt(receiptId);
      return res.status(200).json({
        success: true,
        data: {
          isValid: result.isValid,
          isPaid: result.isPaid,
          receiptId: result.receiptId,
          buyerName: result.buyerName,
          bookTitle: "Gigi the Book: A Journey of Growing Up",
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/library/books/:id
   * Get book reader metadata and table of contents
   */
  static async getBookDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String((req as any).userId || (req as any).user?.id || "");
      const id = String(req.params.id || "");
      const result = await LibraryService.getBookReaderMetadata(userId, id);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/library/books/:id/chapters/:chapterIndex
   * Stream single chapter content (protected)
   */
  static async getChapterContent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String((req as any).userId || (req as any).user?.id || "");
      const id = String(req.params.id || "");
      const chapterIndex = String(req.params.chapterIndex || "0");
      const indexNum = parseInt(chapterIndex, 10);
      const result = await LibraryService.getChapterContent(userId, id, isNaN(indexNum) ? 0 : indexNum);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/library/books/:id/progress
   * Update reading progress and bookmarks
   */
  static async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String((req as any).userId || (req as any).user?.id || "");
      const id = String(req.params.id || "");
      const { lastReadPage, progressPercent, bookmark } = req.body;
      const result = await LibraryService.updateReadingProgress(userId, id, {
        lastReadPage,
        progressPercent,
        bookmark
      });
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/library/etsy-webhook
   * Ingest incoming Etsy order payload from Zapier / Make / Webhook & dispatch Email #1
   */
  static async handleEtsyWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { EtsySyncService } = await import("./etsy.sync.js");
      const record = await EtsySyncService.ingestEtsyOrder(req.body);
      return res.status(200).json({
        success: true,
        message: "Etsy order ingested successfully",
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/library/sync-etsy
   * Trigger batch sync from Etsy OpenAPI v3 (Admin / Cron)
   */
  static async syncEtsyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { EtsySyncService } = await import("./etsy.sync.js");
      const lookbackHours = req.query.hours ? parseInt(String(req.query.hours), 10) : 24;
      const result = await EtsySyncService.syncRecentOrdersFromEtsy(lookbackHours);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

