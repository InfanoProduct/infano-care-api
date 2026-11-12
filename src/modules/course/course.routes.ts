import { Router } from "express";
import { CourseController } from "./course.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { requireAdmin } from "../../common/middleware/requireAdmin.js";

const router = Router();

// Public curriculum read (used for landing/preview, safe static course metadata)
router.get("/curriculum", CourseController.getCurriculum);

// Authenticated learner & parent endpoints
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

// Admin re-seed endpoint
router.post("/admin/seed", requireAuth, requireAdmin, CourseController.seedCourse);

export default router;

