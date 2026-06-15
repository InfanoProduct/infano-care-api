import { Router } from "express";
import { SchoolController } from "./school.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { requireRole } from "./requireRole.middleware.js";

const router = Router();

// Ensure all endpoints are protected by JWT authentication
router.use(requireAuth);

// ─── Ops Manager / Admin Restricted Routes ───────────────────────────────────

// School Onboarding & Registration
router.post(
  "/register",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.registerSchool
);

// List All Schools
router.get(
  "/",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.getSchools
);

// List All Sessions Across All Schools (Central Calendar)
router.get(
  "/sessions/all",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.getAllSessions
);

// Program MOU Deliverables Configuration
router.post(
  "/:id/config",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.configureProgram
);

// Scheduling In-School Session
router.post(
  "/:id/sessions",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.scheduleSession
);

// Rescheduling / Status Update for Session
router.put(
  "/sessions/:sessionId",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.updateSession
);

// Mark Session Completed and Enter Metrics
router.post(
  "/sessions/:sessionId/complete",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.completeSession
);

// Bulk Import Students via CSV List
router.post(
  "/:id/students/import",
  requireRole(["ADMIN", "OPS_MANAGER"]),
  SchoolController.importStudents
);

// ─── Shared Routes (School Coordinator + Ops Manager + Admin) ─────────────────

// Fetch details for specific school (Row-level security checked in controller)
router.get(
  "/:id",
  requireRole(["ADMIN", "OPS_MANAGER", "SCHOOL_COORDINATOR"]),
  SchoolController.getSchoolById
);

// Fetch DPDP-compliant wellness insights for specific school
router.get(
  "/:id/wellness-insights",
  requireRole(["ADMIN", "OPS_MANAGER", "SCHOOL_COORDINATOR"]),
  SchoolController.getWellnessInsights
);

export default router;
