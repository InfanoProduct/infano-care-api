import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import { requireAdmin } from "../../common/middleware/requireAdmin.js";
import { upload } from "../../common/middleware/upload.js";
import { TrackerContentController } from "../tracker/tracker_content.controller.js";
import { ProgramsController } from "../programs/programs.controller.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get("/stats", AdminController.getStats);
router.get("/users", AdminController.getUsers);
router.get("/users/:id", AdminController.getUser);
router.patch("/users/:id/approve-peer", AdminController.approvePeer);
router.patch("/users/:id/approve-certification", AdminController.approveCertification);
router.patch("/users/:id/unapprove-assessment", AdminController.unapproveAssessment);
router.patch("/users/:id/revoke-peer", AdminController.revokePeer);
router.get("/mentors", AdminController.getMentors);

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

// Universal Assets Management
router.get("/assets", AdminController.listAssets);
router.delete("/assets/:filename", AdminController.deleteAsset);

// Order Management
router.get("/orders", AdminController.getOrders);
router.get("/orders/:id", AdminController.getOrder);
router.patch("/orders/:id/status", AdminController.updateOrderStatus);
router.post("/orders/:id/manual-payment", AdminController.verifyManualPayment);

// Book Management
router.get("/books", AdminController.getBooks);
router.post("/books", AdminController.createBook);
router.patch("/books/:id", AdminController.updateBook);
router.delete("/books/:id", AdminController.deleteBook);

// Circle Management
router.get("/circles", AdminController.getCircles);
router.post("/circles", AdminController.createCircle);
router.patch("/circles/:id", AdminController.updateCircle);
router.delete("/circles/:id", AdminController.deleteCircle);

// Enquiry Management
router.get("/enquiries", AdminController.getEnquiries);
router.get("/enquiries/:id", AdminController.getEnquiry);


// ─── Tracker Content Management ─────────────────────────────────────────────
// Daily Insights (cards shown in "My Daily Insights" section)
router.get("/tracker/insights", TrackerContentController.listInsights);
router.post("/tracker/insights", TrackerContentController.createInsight);
router.patch("/tracker/insights/:id", TrackerContentController.updateInsight);
router.delete("/tracker/insights/:id", TrackerContentController.deleteInsight);

// Stories within an insight (Instagram-style slides with optional image upload)
router.get("/tracker/insights/:insightId/stories", TrackerContentController.listStories);
router.post("/tracker/insights/:insightId/stories", TrackerContentController.createStory);
router.post(
  "/tracker/insights/:insightId/stories/:id/image",
  upload.single("file"),
  TrackerContentController.uploadStoryImage,
);
router.patch("/tracker/insights/:insightId/stories/:id", TrackerContentController.updateStory);
router.delete("/tracker/insights/:insightId/stories/:id", TrackerContentController.deleteStory);

// Good to Know Articles
router.get("/tracker/articles", TrackerContentController.listArticles);
router.post("/tracker/articles", TrackerContentController.createArticle);
router.patch("/tracker/articles/:id", TrackerContentController.updateArticle);
router.delete("/tracker/articles/:id", TrackerContentController.deleteArticle);

// Learning Programs Management
router.get("/programs", ProgramsController.adminList);
router.post("/programs", ProgramsController.adminCreate);
router.patch("/programs/:id", ProgramsController.adminUpdate);
router.delete("/programs/:id", ProgramsController.adminDelete);

// Learning Programs Enrollments
router.get("/programs/check-user", ProgramsController.checkUserByPhone);
router.get("/programs/enrollments", ProgramsController.adminListEnrollments);
router.post("/programs/enrollments", ProgramsController.adminCreateEnrollment);

router.patch("/programs/enrollments/:id", ProgramsController.adminUpdateEnrollmentStatus);

// Learning Programs Demo Sessions Bookings
router.get("/programs/demos", ProgramsController.adminListDemos);
router.get("/programs/demos/:id", ProgramsController.adminGetDemo);
router.patch("/programs/demos/:id", ProgramsController.adminUpdateDemoStatus);

export default router;
