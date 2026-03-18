import { Router } from "express";
import { UserController } from "./user.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { onboardingSchema } from "../auth/auth.schema.js";

const router = Router();

router.use(authenticate);

router.post("/onboarding", validate(onboardingSchema), UserController.onboarding);
router.get("/me", UserController.getMe);

export default router;
