import { Router } from "express";
import { UserController } from "./user.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";

const router = Router();

router.use(requireAuth);

router.get("/me", UserController.getMe);
router.patch("/onboarding-stage", UserController.updateOnboardingStage);

export default router;
