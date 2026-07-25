import { Router } from "express";
import { ExpertController } from "./expert.controller.js";
import { authenticate } from "../../common/middleware/auth.js";


const router = Router();

router.use(authenticate);
// router.use(requireRole(["EXPERT", "ADMIN"])); // Optional, depending on strictness

router.get("/enrollments", ExpertController.getEnrollments);
router.get("/enrollments/:id", ExpertController.getEnrollmentDetails);

router.get("/calendar", ExpertController.getCalendarSettings);
router.put("/calendar", ExpertController.updateCalendarSettings);

router.get("/sessions", ExpertController.getSessions);
router.post("/sessions", ExpertController.scheduleSession);
router.patch("/sessions/:id/complete", ExpertController.completeSession);
router.patch("/sessions/:id/status", ExpertController.updateSessionStatus);
router.patch("/sessions/:id/meet-link", ExpertController.updateSessionMeetLink);
router.patch("/sessions/:id/reschedule", ExpertController.rescheduleSession);


export default router;
