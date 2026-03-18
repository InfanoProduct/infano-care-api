import { Router } from "express";
import { TrackerController } from "./tracker.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { dailyLogSchema } from "./tracker.schema.js";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

router.post("/setup", TrackerController.setup);
router.post("/log",   (req, res, next) => {
  try { dailyLogSchema.parse(req.body); next(); } catch (e) { next(e); }
}, TrackerController.logDaily);
router.get("/logs",       TrackerController.getLogs);
router.get("/prediction", TrackerController.getPrediction);

export default router;
