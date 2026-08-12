import { Router } from "express";
import { LmsController } from "./lms.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import { requireAdmin } from "../../common/middleware/requireAdmin.js";

const router = Router();

// User endpoints
router.get("/explore", LmsController.exploreCourses);
router.get("/my-courses", authenticate, LmsController.myCourses);
router.get("/:id", LmsController.getCourseDetails);
router.post("/:id/purchase", authenticate, LmsController.purchaseCourse);
router.post("/:id/verify-purchase", authenticate, LmsController.verifyPurchase);
router.get("/:courseId/progress", authenticate, LmsController.getCourseProgress);
router.post("/:courseId/chapters/:chapterId/complete", authenticate, LmsController.markChapterComplete);

// Admin endpoints
router.post("/admin/courses", authenticate, requireAdmin, LmsController.createCourse);
router.get("/admin/courses", authenticate, requireAdmin, LmsController.getAdminCourses);
router.put("/admin/courses/:id", authenticate, requireAdmin, LmsController.updateCourse);
router.delete("/admin/courses/:id", authenticate, requireAdmin, LmsController.deleteCourse);

router.post("/admin/courses/:courseId/modules", authenticate, requireAdmin, LmsController.addModule);
router.put("/admin/modules/:moduleId", authenticate, requireAdmin, LmsController.updateModule);
router.delete("/admin/modules/:moduleId", authenticate, requireAdmin, LmsController.deleteModule);

router.post("/admin/modules/:moduleId/chapters", authenticate, requireAdmin, LmsController.addChapter);
router.put("/admin/chapters/:chapterId", authenticate, requireAdmin, LmsController.updateChapter);
router.delete("/admin/chapters/:chapterId", authenticate, requireAdmin, LmsController.deleteChapter);

export default router;
