import { Router } from "express";
import { TrackerController } from "./tracker.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { dailyLogSchema } from "./tracker.schema.js";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

router.post("/setup",      TrackerController.setup);
router.post("/log",        TrackerController.logDaily);
router.get("/logs",        TrackerController.getLogs);
router.get("/prediction",  TrackerController.getPrediction);
router.get("/insights",    TrackerController.getInsights);
router.get("/report",      TrackerController.getDoctorSummary);

export default router;
