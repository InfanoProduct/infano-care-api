import { Router } from "express";
import { OnboardingController } from "./onboarding.controller.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";

const router = Router();

router.use(requireAuth);

router.post("/personalization", OnboardingController.savePersonalization);
router.post("/avatar",          OnboardingController.saveAvatar);
router.post("/journey-name",    OnboardingController.saveJourneyName);
router.post("/complete",        OnboardingController.completeOnboarding);

export default router;
