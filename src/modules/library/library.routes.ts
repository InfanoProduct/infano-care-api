import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { LibraryController } from "./library.controller.js";

const router = Router();

// Public: Pre-validate Etsy order ID for the /redeem page
router.get("/verify-order/:receiptId", LibraryController.verifyEtsyOrder);

// Public / Webhook: Ingest Etsy order from Zapier/Make or Etsy relay & dispatch Email #1
router.post("/etsy-webhook", LibraryController.handleEtsyWebhook);

// Admin / Cron: Sync recent orders directly from Etsy Open API
router.post("/sync-etsy", LibraryController.syncEtsyOrders);

// Authenticated: Library operations
router.get("/my-books", authenticate, LibraryController.getMyBooks);
router.post("/claim-etsy", authenticate, LibraryController.claimEtsyOrder);
router.get("/books/:id", authenticate, LibraryController.getBookDetails);
router.get("/books/:id/chapters/:chapterIndex", authenticate, LibraryController.getChapterContent);
router.post("/books/:id/progress", authenticate, LibraryController.updateProgress);

export default router;
