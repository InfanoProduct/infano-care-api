import { Router } from "express";
import { MindfulController } from "./mindful.controller.js";
import { authenticate } from "../../common/middleware/auth.js";

const router = Router();

router.get("/", authenticate, MindfulController.list);
router.post("/complete", authenticate, MindfulController.complete);
router.post("/admin/create", authenticate, MindfulController.create); // Simplified admin check for now

export default router;
