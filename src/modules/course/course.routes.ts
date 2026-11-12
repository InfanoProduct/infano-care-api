import { Router } from "express";
import { CourseController } from "./course.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { requireAdmin } from "../../common/middleware/requireAdmin.js";

const router = Router();

// Public curriculum, catalog & checkout routes
router.get("/curriculum", CourseController.getCurriculum);
router.get("/catalog", CourseController.getCatalog);
router.get("/details/:idOrSlug", CourseController.getCourseDetail);
router.post("/public/check-enrollment", CourseController.checkPublicEnrollment);
router.post("/public/check-reader-status", CourseController.checkReaderStatus);
router.post("/public/purchase", CourseController.publicPurchaseCourse);
router.post("/public/verify-purchase", CourseController.publicVerifyPurchase);

// Authenticated learner & parent endpoints
router.get("/my-enrollments", requireAuth, CourseController.getMyEnrollments);
router.get("/lessons/:lessonId", requireAuth, CourseController.getLessonDetail);
router.get("/checkins/:checkinId", requireAuth, CourseController.getCheckin);

router.get("/learner/:learnerId/state", requireAuth, CourseController.getLearnerState);
router.post("/learner/:learnerId/lessons/:lessonId/watch", requireAuth, CourseController.saveWatchProgress);
router.post("/learner/:learnerId/lessons/:lessonId/activity", requireAuth, CourseController.saveActivityResult);
router.post("/learner/:learnerId/lessons/:lessonId/discover", requireAuth, CourseController.completeDiscover);
router.post("/learner/:learnerId/lessons/:lessonId/reflect", requireAuth, CourseController.completeReflect);
router.post("/learner/:learnerId/checkins/:checkinId/submit", requireAuth, CourseController.submitCheckin);
router.post("/learner/:learnerId/badges/:badgeId/share", requireAuth, CourseController.shareBadge);
router.post("/learner/:learnerId/myth-answered", requireAuth, CourseController.recordMythAnswered);

// Parent-safe endpoints (progress, scores, badges, preview — never private journal/diary/worries)
router.get("/parent/overview/:learnerId", requireAuth, CourseController.getParentOverview);

// Admin curriculum & course management endpoints
router.post("/admin/seed", requireAuth, requireAdmin, CourseController.seedCourse);
router.get("/admin/overview", requireAuth, requireAdmin, CourseController.adminGetOverview);
router.patch("/admin/courses/:courseId", requireAuth, requireAdmin, CourseController.adminUpdateCourse);
router.patch("/admin/chapters/:chapterId", requireAuth, requireAdmin, CourseController.adminUpdateChapter);
router.patch("/admin/lessons/:lessonId", requireAuth, requireAdmin, CourseController.adminUpdateLesson);
router.patch("/admin/checkins/:checkinId", requireAuth, requireAdmin, CourseController.adminUpdateCheckin);
router.post("/admin/enrollments", requireAuth, requireAdmin, CourseController.adminGrantEnrollment);
router.patch("/admin/enrollments/:enrollmentId", requireAuth, requireAdmin, CourseController.adminUpdateEnrollmentStatus);

export default router;

