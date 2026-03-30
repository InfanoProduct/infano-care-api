import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { ConsentService } from "./consent.service.js";
import { requireAuth } from "../../common/middleware/requireAuth.js";
import { z } from "zod";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Parental Consent
 *   description: Handling parental approval for teen accounts
 */

/**
 * @openapi
 * /api/auth/consent/send:
 *   post:
 *     summary: Send consent request email to parent
 *     tags: [Parental Consent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parentEmail]
 *             properties:
 *               parentEmail: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Email sent successfully
 */
router.post("/send", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentEmail } = z.object({ parentEmail: z.string().email() }).parse(req.body);
    await ConsentService.sendConsentEmail((req as any).userId, parentEmail);
    res.status(200).json({ message: "Consent email sent to parent." });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/auth/consent/status:
 *   get:
 *     summary: Check current consent status for a teen
 *     tags: [Parental Consent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consent status details
 */
router.get("/status", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ConsentService.getConsentStatus((req as any).userId);
    res.status(200).json(result);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/auth/consent/approve:
 *   post:
 *     summary: Approve consent (Parent Endpoint)
 *     description: Endpoint called by parents clicking the email link
 *     tags: [Parental Consent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Consent approved successfully
 */
router.post("/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    await ConsentService.approveConsent(token, req.ip);
    res.status(200).json({ message: "Consent approved! Your daughter can now use Infano.Care. 🌸" });
  } catch (e) { next(e); }
});

export default router;
