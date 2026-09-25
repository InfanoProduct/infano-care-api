import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { LibraryController } from "./library.controller.js";

const router = Router();

// Public: Pre-validate Etsy order ID for the /redeem page
router.get("/verify-order/:receiptId", LibraryController.verifyEtsyOrder);

// Authenticated: Library operations
router.get("/my-books", authenticate, LibraryController.getMyBooks);
router.post("/claim-etsy", authenticate, LibraryController.claimEtsyOrder);
router.get("/books/:id", authenticate, LibraryController.getBookDetails);
router.get("/books/:id/chapters/:chapterIndex", authenticate, LibraryController.getChapterContent);
router.post("/books/:id/progress", authenticate, LibraryController.updateProgress);

export default router;
