import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { ConsentService } from "./consent.service.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { z } from "zod";

const router = Router();

// POST /api/auth/consent/send — authenticated teen sends parent email
router.post("/send", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentEmail } = z.object({ parentEmail: z.string().email() }).parse(req.body);
    await ConsentService.sendConsentEmail((req as any).userId, parentEmail);
    res.status(200).json({ message: "Consent email sent to parent." });
  } catch (e) { next(e); }
});

// GET /api/auth/consent/status — teen polls for approval
router.get("/status", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ConsentService.getConsentStatus((req as any).userId);
    res.status(200).json(result);
  } catch (e) { next(e); }
});

// POST /api/auth/consent/approve — parent clicks link (no auth required, token carries identity)
router.post("/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    await ConsentService.approveConsent(token, req.ip);
    res.status(200).json({ message: "Consent approved! Your daughter can now use Infano.Care. 🌸" });
  } catch (e) { next(e); }
});

export default router;
