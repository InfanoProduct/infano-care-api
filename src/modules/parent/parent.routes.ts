import { Router } from "express";
import { ParentController } from "./parent.controller.js";
import { ParentSpaceController } from "./parent-space.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";

const router = Router();

// Public routes (no auth required)
router.get("/daily-quote", ParentController.getDailyQuote);
router.get("/resources", ParentController.getResources);
router.get("/public/experts", ParentController.getExperts);
router.get("/public/experts/:id/slots", ParentController.getExpertSlots);
router.post("/public/experts/book", ParentController.bookPublicExpertSession);
router.post("/public/experts/verify-payment", ParentController.verifyPublicExpertSessionPayment);

router.use(requireAuth);

router.post("/invite", ParentController.invite);
router.get("/", ParentController.getLinks);
router.get("/notifications", ParentController.getNotifications);
router.delete("/notifications/:id", ParentController.dismissNotification);
router.delete("/notifications", ParentController.clearAllNotifications);
router.get("/dashboard-summary", ParentController.getDashboardSummary);
router.get("/daughter/:teenId/report", ParentController.getDaughterReport);
router.post("/cancel/:id", ParentController.cancelInvite);
router.post("/accept/:id", ParentController.acceptInvite);

// Expert Session endpoints
router.get("/experts", ParentController.getExperts);
router.get("/experts/:id/slots", ParentController.getExpertSlots);
router.post("/experts/book", ParentController.bookExpertSession);
router.post("/experts/verify-payment", ParentController.verifyExpertSessionPayment);
router.get("/expert-sessions", ParentController.getExpertSessions);
router.patch("/expert-sessions/:id/cancel", ParentController.cancelExpertSession);
router.patch("/expert-sessions/:id/reschedule", ParentController.rescheduleExpertSession);

// Resource Bookmarks (auth required)
router.get("/bookmarks", ParentController.getBookmarks);
router.post("/resources/:id/bookmark", ParentController.bookmarkResource);
router.delete("/resources/:id/bookmark", ParentController.unbookmarkResource);

// Parent Space Orders, Refunds, Settings & Help (auth required)
router.get("/orders-summary", ParentSpaceController.getOrdersSummary);
router.post("/orders/:orderId/refund", ParentSpaceController.requestRefund);
router.post("/orders/:orderId/report", ParentSpaceController.reportOrderIssue);
router.patch("/orders/:orderId/address", ParentSpaceController.updateOrderAddress);

router.get("/settings", ParentSpaceController.getSettings);
router.patch("/settings", ParentSpaceController.updateSettings);
router.post("/settings/change-pin", ParentSpaceController.changePin);
router.patch("/learners/:learnerId", ParentSpaceController.updateLearner);
router.delete("/learners/:learnerId/health-answers", ParentSpaceController.clearHealthAnswers);
router.delete("/learners/:learnerId", ParentSpaceController.deleteLearner);

router.post("/support/concern", ParentSpaceController.submitConcern);

export default router;
