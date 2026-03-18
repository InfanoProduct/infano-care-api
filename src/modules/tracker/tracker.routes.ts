import { Router } from "express";
import { TrackerController } from "./tracker.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { dailyLogSchema } from "./tracker.schema.js";

const router = Router();

router.use(authenticate);

router.post("/log", validate(dailyLogSchema), TrackerController.logDaily);
router.get("/logs", TrackerController.getLogs);
router.get("/prediction", TrackerController.getPrediction);

export default router;
