import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import { requireAdmin } from "../../common/middleware/requireAdmin.js";

import { upload } from "../../common/middleware/upload.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get("/stats", AdminController.getStats);
router.get("/users", AdminController.getUsers);

// Learning Journey Management
router.get("/learning/journeys", AdminController.getJourneys);
router.get("/learning/journeys/:id", AdminController.getJourney);
router.post("/learning/journeys", AdminController.createJourney);
router.patch("/learning/journeys/:id", AdminController.updateJourney);
router.delete("/learning/journeys/:id", AdminController.deleteJourney);

// Episode Management
router.post("/learning/journeys/:journeyId/episodes", AdminController.createEpisode);
router.patch("/learning/episodes/:id", AdminController.updateEpisode);
router.delete("/learning/episodes/:id", AdminController.deleteEpisode);

// File Upload
router.post("/upload", upload.single("file"), AdminController.upload);

// Order Management
router.get("/orders", AdminController.getOrders);
router.get("/orders/:id", AdminController.getOrder);
router.patch("/orders/:id/status", AdminController.updateOrderStatus);

// Book Management
router.post("/books", AdminController.createBook);
router.patch("/books/:id", AdminController.updateBook);
router.delete("/books/:id", AdminController.deleteBook);

export default router;
