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
router.get("/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #e11d48;">Invalid Request</h2>
          <p>No token provided for parental consent.</p>
        </div>
      `);
    }

    await ConsentService.approveConsent(token, req.ip);

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Parent Consent Approved | Infano.Care</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #faf5ff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(109,40,217,0.1); max-width: 480px; text-align: center; border: 1px solid #ede9fe; }
          .icon { font-size: 56px; margin-bottom: 16px; }
          h1 { color: #5b21b6; margin: 0 0 12px; font-size: 24px; }
          p { color: #4b5563; line-height: 1.6; font-size: 15px; margin: 0 0 24px; }
          .badge { display: inline-block; background: #ecfdf5; color: #059669; font-weight: bold; padding: 8px 18px; border-radius: 50px; font-size: 14px; border: 1px solid #a7f3d0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🌸</div>
          <h1>Permission Granted!</h1>
          <p>Thank you for approving your daughter's account. Her Infano.Care app has now been unlocked and she can continue her journey safely.</p>
          <div class="badge">✅ Account Successfully Approved</div>
        </div>
      </body>
      </html>
    `);
  } catch (e: any) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consent Error | Infano.Care</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff1f2; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(225,29,72,0.1); max-width: 480px; text-align: center; border: 1px solid #ffe4e6; }
          .icon { font-size: 56px; margin-bottom: 16px; }
          h1 { color: #be123c; margin: 0 0 12px; font-size: 24px; }
          p { color: #4b5563; line-height: 1.6; font-size: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚠️</div>
          <h1>Link Expired or Already Used</h1>
          <p>${e.message || "This approval link is invalid or has already been used."}</p>
        </div>
      </body>
      </html>
    `);
  }
});

router.post("/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    await ConsentService.approveConsent(token, req.ip);
    res.status(200).json({ message: "Consent approved! Your daughter can now use Infano.Care. 🌸" });
  } catch (e) { next(e); }
});

export default router;
